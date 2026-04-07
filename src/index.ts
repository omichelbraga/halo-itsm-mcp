#!/usr/bin/env node

/**
 * Halo ITSM MCP Server
 *
 * Complete MCP server for Halo ITSM platform.
 * Exposes 85 tools across 21 resource domains.
 *
 * Transport modes:
 *   - stdio  (default): For Claude Desktop / Claude Code local use
 *   - http:  For Docker / remote deployment (Streamable HTTP + SSE)
 *
 * Authentication modes:
 *   - env:   Client ID + Secret from environment variables (default)
 *   - oauth: Proxied OAuth2 via MCP protocol (Claude connector UI)
 *
 * The server always runs plain HTTP. TLS is handled by your reverse proxy
 * (nginx, Caddy, Traefik, etc.) in production.
 *
 * Usage:
 *   stdio:       node dist/index.js
 *   http:        MCP_TRANSPORT=http node dist/index.js
 *   http+oauth:  MCP_TRANSPORT=http MCP_AUTH=oauth node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import express from "express";
import { z } from "zod";

// ==================== SECURITY HEADERS ====================

/**
 * Middleware that sets security headers on every response.
 * Defence-in-depth: the reverse proxy should also set these,
 * but we add them here in case the proxy misses any.
 */
function securityHeaders(): express.RequestHandler {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0"); // Modern best practice: rely on CSP, disable legacy XSS filter
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // HSTS is only meaningful over HTTPS — the reverse proxy should set this,
    // but we add it so it's present if the proxy forwards the header through.
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}
import { loadConfig, validateUrl, type HaloConfig } from "./types/config.js";
import { HaloClient } from "./client/halo-client.js";
import {
  createHaloOAuthProvider,
  captureClientSecret,
  captureRedirectUri,
  injectPkceIfMissing,
  injectPkceVerifier,
} from "./auth/proxy-provider.js";
import { buildAllTools } from "./tools/registry.js";
import { buildResources } from "./resources/context.js";
import { logger, setLogLevel } from "./utils/logger.js";

import type { Request, Response, RequestHandler } from "express";

// ==================== MCP SERVER FACTORY ====================

function createHaloMcpServer(client: HaloClient, config: HaloConfig): McpServer {
  const toolMap = buildAllTools(client);
  const resources = buildResources(client, config);

  const server = new McpServer({
    name: "halo-itsm",
    version: "1.0.0",
  });

  for (const [name, tool] of toolMap) {
    server.tool(
      name,
      tool.description,
      (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape,
      async (args: Record<string, unknown>) => {
        logger.debug(`Tool called: ${name}`, { args: Object.keys(args) });
        return await tool.handler(args);
      }
    );
  }

  for (const resource of resources) {
    server.resource(
      resource.name,
      resource.uri,
      { mimeType: resource.mimeType, description: resource.description },
      async () => ({
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: await resource.handler(),
        }],
      })
    );
  }

  return server;
}

// ==================== TOKEN-AWARE CLIENT ====================

function createOAuthClient(baseUrl: string): { client: HaloClient; config: HaloConfig } {
  const config: HaloConfig = {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    clientId: "oauth-proxy",
    clientSecret: "unused",
    scope: "all",
    logLevel: (process.env.LOG_LEVEL as HaloConfig["logLevel"]) || "info",
  };
  return { client: new HaloClient(config), config };
}

// ==================== STDIO TRANSPORT ====================

async function startStdio(client: HaloClient, config: HaloConfig): Promise<void> {
  const server = createHaloMcpServer(client, config);
  const transport = new StdioServerTransport();
  logger.info("Connecting via stdio transport...");
  await server.connect(transport);
  logger.info("Halo ITSM MCP Server running (stdio). Waiting for requests.");
}

// ==================== HTTP TRANSPORT (ENV AUTH) ==============

async function startHttp(client: HaloClient, config: HaloConfig): Promise<void> {
  const port = parseInt(process.env.MCP_PORT || "3000", 10);
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.set("trust proxy", 1);
  app.use(securityHeaders());
  app.use(express.json({ limit: "1mb" }) as express.RequestHandler);
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "halo-itsm-mcp",
      version: "1.0.0",
      auth: "env",
      instance: config.baseUrl,
      authenticated: client.isAuthenticated(),
      rateLimit: client.getRateLimitStatus(),
      activeSessions: Object.keys(transports).length,
      uptime: process.uptime(),
    });
  });

  setupMcpRoutes(app, transports, (req, res) => {
    const server = createHaloMcpServer(client, config);
    return server;
  });

  app.listen(port, () => {
    logger.info(`Halo ITSM MCP Server running (HTTP) on port ${port}`);
    logger.info(`  MCP endpoint:    http://0.0.0.0:${port}/mcp`);
    logger.info(`  Health check:    http://0.0.0.0:${port}/health`);
  });

  setupGracefulShutdown(transports);
}

// ==================== HTTP + OAUTH TRANSPORT ================

async function startHttpWithOAuth(haloBaseUrl: string): Promise<void> {
  const port = parseInt(process.env.MCP_PORT || "3000", 10);

  // MCP_PUBLIC_URL is what the reverse proxy exposes (https://...)
  // Defaults to http://localhost:{port} for local dev
  const publicUrl = process.env.MCP_PUBLIC_URL || `http://localhost:${port}`;
  const serverUrl = new URL(publicUrl);
  const mcpEndpoint = new URL(`${publicUrl}/mcp`);

  const app = createMcpExpressApp({ host: "0.0.0.0" });

  // Trust reverse proxy (ngrok, nginx, etc.) so X-Forwarded-For works correctly
  app.set("trust proxy", 1);
  app.use(securityHeaders());
  app.use(express.json({ limit: "1mb" }) as express.RequestHandler);

  // Custom OAuth server: bridges Claude's Authorization Code flow to Halo's Client Credentials
  const oauthProvider = createHaloOAuthProvider(haloBaseUrl);

  // Parse URL-encoded bodies on /token BEFORE the auth router.
  // OAuth token requests use application/x-www-form-urlencoded.
  // Without this, req.body is empty when our capture middleware runs.
  app.use("/token", express.urlencoded({ extended: false }) as RequestHandler);

  // Capture client_secret from token requests BEFORE the SDK's auth router processes them.
  app.use("/token", captureClientSecret() as unknown as RequestHandler);

  // Inject auto-generated code_verifier for non-PKCE clients (like n8n)
  app.use("/token", injectPkceVerifier() as unknown as RequestHandler);

  // Capture redirect_uri from authorize requests BEFORE the SDK validates it.
  // This allows any MCP client (Claude, n8n, etc.) to connect without pre-registration.
  app.use("/authorize", captureRedirectUri(oauthProvider.clientsStore) as unknown as RequestHandler);

  // Auto-inject PKCE params for clients that don't support it (n8n, etc.)
  app.use("/authorize", injectPkceIfMissing() as unknown as RequestHandler);

  // Install the full OAuth auth router (metadata, token, authorize, register endpoints)
  app.use(mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: serverUrl,
    baseUrl: serverUrl,
    scopesSupported: ["all"],
    resourceName: "Halo ITSM MCP Server",
    resourceServerUrl: mcpEndpoint,
  }));

  // The SDK registers protected resource metadata at /.well-known/oauth-protected-resource/mcp
  // (per RFC 9728 path-based discovery). Some clients look at /.well-known/oauth-protected-resource
  // without the /mcp suffix. Serve the same metadata at both paths.
  app.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response) => {
    res.json({
      resource: mcpEndpoint.href,
      authorization_servers: [serverUrl.href],
      scopes_supported: ["all"],
      bearer_methods_supported: ["header"],
      resource_name: "Halo ITSM MCP Server",
    });
  });

  // Bearer auth middleware for the MCP endpoints
  const authMiddleware = requireBearerAuth({ verifier: oauthProvider });

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Health check (no auth required)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "halo-itsm-mcp",
      version: "1.0.0",
      auth: "oauth-proxy",
      instance: haloBaseUrl,
      publicUrl,
      activeSessions: Object.keys(transports).length,
      uptime: process.uptime(),
    });
  });

  // MCP routes with OAuth middleware
  // Extract the Bearer token from the request and pass it to the HaloClient
  // so it uses the real Halo token instead of trying Client Credentials with dummy creds
  setupMcpRoutes(app, transports, (req) => {
    const { client, config } = createOAuthClient(haloBaseUrl);

    // Extract the Halo access token from the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      client.setToken(token);
    }

    return createHaloMcpServer(client, config);
  }, authMiddleware as RequestHandler);

  // Plain HTTP - reverse proxy handles TLS
  app.listen(port, () => {
    logger.info(`Halo ITSM MCP Server running (HTTP + OAuth proxy) on port ${port}`);
    logger.info(`  Internal:        http://0.0.0.0:${port}/mcp`);
    logger.info(`  Public URL:      ${publicUrl}/mcp`);
    logger.info(`  Health check:    http://0.0.0.0:${port}/health`);
    logger.info(`  OAuth metadata:  ${publicUrl}/.well-known/oauth-authorization-server`);
    logger.info("");
    logger.info("Claude connector settings:");
    logger.info(`  URL:                 ${publicUrl}`);
    logger.info("  OAuth Client ID:     (your Halo API Client ID)");
    logger.info("  OAuth Client Secret: (your Halo API Client Secret)");
  });

  setupGracefulShutdown(transports);
}

// ==================== SHARED ROUTE SETUP ====================

function setupMcpRoutes(
  app: ReturnType<typeof createMcpExpressApp>,
  transports: Record<string, StreamableHTTPServerTransport>,
  createServer: (req: Request, res: Response) => McpServer,
  authMiddleware?: RequestHandler,
): void {
  const handlers = {
    post: async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      try {
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          transport = transports[sessionId];
        } else if (isInitializeRequest(req.body)) {
          // Accept initialize requests even if a stale session ID is provided
          // (e.g., after server restart). This allows clients to reconnect.
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid: string) => {
              logger.info(`Session initialized: ${sid}`);
              transports[sid] = transport;
            },
          });
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) {
              logger.info(`Session closed: ${sid}`);
              delete transports[sid];
            }
          };
          const server = createServer(req, res);
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return;
        } else {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID" },
            id: null,
          });
          return;
        }
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error("Error handling MCP POST", { error: (error as Error).message });
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
        }
      }
    },

    get: async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    },

    delete: async (req: Request, res: Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    },
  };

  if (authMiddleware) {
    app.post("/mcp", authMiddleware, handlers.post);
    app.get("/mcp", authMiddleware, handlers.get);
    app.delete("/mcp", authMiddleware, handlers.delete);
  } else {
    app.post("/mcp", handlers.post);
    app.get("/mcp", handlers.get);
    app.delete("/mcp", handlers.delete);
  }
}

// ==================== HELPERS ===============================

function setupGracefulShutdown(transports: Record<string, StreamableHTTPServerTransport>): void {
  const shutdown = async () => {
    logger.info("Shutting down...");
    for (const sid of Object.keys(transports)) {
      try {
        await transports[sid].close();
        delete transports[sid];
      } catch (err) {
        logger.error(`Error closing session ${sid}`, { error: (err as Error).message });
      }
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ========================= MAIN ==============================

async function main(): Promise<void> {
  const transport = process.env.MCP_TRANSPORT || "stdio";
  const authMode = process.env.MCP_AUTH || "env";

  // OAuth mode only needs HALO_BASE_URL
  if (transport === "http" && authMode === "oauth") {
    const baseUrl = process.env.HALO_BASE_URL;
    if (!baseUrl) {
      process.stderr.write("HALO_BASE_URL environment variable is required for OAuth mode.\n");
      process.exit(1);
    }
    try {
      validateUrl(baseUrl, "HALO_BASE_URL");
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(1);
    }
    setLogLevel((process.env.LOG_LEVEL as HaloConfig["logLevel"]) || "info");
    logger.info("Starting Halo ITSM MCP Server (OAuth proxy mode)", { instance: baseUrl });
    await startHttpWithOAuth(baseUrl.replace(/\/+$/, ""));
    return;
  }

  // Standard mode: needs full credentials in env
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    process.stderr.write(`Configuration error: ${(err as Error).message}\n`);
    process.stderr.write("Set HALO_BASE_URL, HALO_CLIENT_ID, and HALO_CLIENT_SECRET environment variables.\n");
    process.stderr.write('Or use MCP_AUTH=oauth mode (only requires HALO_BASE_URL).\n');
    process.exit(1);
  }

  setLogLevel(config.logLevel);
  logger.info("Starting Halo ITSM MCP Server", { instance: config.baseUrl, scope: config.scope });

  const client = new HaloClient(config);

  if (transport === "http") {
    await startHttp(client, config);
  } else {
    await startStdio(client, config);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${(err as Error).message}\n`);
  process.exit(1);
});
