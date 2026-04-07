/**
 * Halo ITSM MCP Server - Custom OAuth Server Provider
 *
 * Bridges MCP's OAuth2 Authorization Code flow (required by the protocol)
 * to Halo's OAuth2 Client Credentials flow (what Halo supports).
 *
 * Flow:
 * 1. Claude sends GET /authorize with client_id -> we auto-approve and redirect
 *    back with an authorization code (no user interaction needed)
 * 2. Claude sends POST /token with code + client_secret -> we capture the secret
 *    via middleware, then call Halo's token endpoint with Client Credentials
 * 3. Claude uses the Halo access token for MCP requests
 */

import type { Response } from "express";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { OAuthClientInformationFull, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { logger } from "../utils/logger.js";

// ==================== TYPES ====================

interface AuthorizationParams {
  state?: string;
  scopes?: string[];
  codeChallenge: string;
  redirectUri: string;
  resource?: URL;
}

interface PendingAuthorization {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes: string[];
  createdAt: number;
}

// ==================== IN-MEMORY STORES ====================

// Pending authorization codes (short-lived, 5 min TTL)
const pendingCodes = new Map<string, PendingAuthorization>();

// Captured client secrets from token requests (keyed by client_id)
// This is needed because the SDK's authenticateClient middleware
// doesn't forward the raw client_secret to exchangeAuthorizationCode.
const capturedSecrets = new Map<string, string>();

// Auto-generated PKCE code_verifiers for non-PKCE clients like n8n
// Keyed by client_id. When a client doesn't send code_challenge,
// we generate PKCE params server-side to satisfy the MCP SDK's requirement.
const generatedPkce = new Map<string, string>();

// Clean up expired codes every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, pending] of pendingCodes) {
    if (now - pending.createdAt > 5 * 60 * 1000) {
      pendingCodes.delete(code);
    }
  }
}, 60_000);

// ==================== CLIENT STORE ====================

class HaloClientsStore implements OAuthRegisteredClientsStore {
  // Track redirect URIs we've seen so they pass validation on subsequent calls
  private seenRedirectUris = new Set<string>([
    "https://claude.ai/api/mcp/auth_callback",
    "https://app.claude.ai/api/mcp/auth_callback",
  ]);

  addRedirectUri(uri: string): void {
    this.seenRedirectUris.add(uri);
  }

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    // Accept any client_id. We do NOT set client_secret here so the SDK
    // skips secret validation in authenticateClient middleware.
    // Halo will validate the actual credentials at the token endpoint.
    //
    // redirect_uris is intentionally permissive. The SDK validates the incoming
    // redirect_uri against this list. Since our "authorize" is auto-approved
    // (no user interaction), and Halo validates credentials at the token step,
    // restricting redirect_uris adds no security value here.
    return {
      client_id: clientId,
      redirect_uris: [...this.seenRedirectUris],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    } as OAuthClientInformationFull;
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const clientId = (client as Record<string, unknown>).client_id as string || randomUUID();
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    } as OAuthClientInformationFull;
    logger.info("Registered OAuth client", { clientId });
    return full;
  }
}

// ==================== SECRET CAPTURE MIDDLEWARE ====================

/**
 * Express middleware that captures the client_secret from token requests
 * BEFORE the SDK's authenticateClient middleware runs. This is necessary
 * because when token_endpoint_auth_method is "none", the SDK doesn't
 * forward the client_secret to our exchangeAuthorizationCode method.
 */
export function captureClientSecret() {
  return (req: { body?: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const body = req.body;
    if (body && typeof body.client_id === "string" && typeof body.client_secret === "string") {
      capturedSecrets.set(body.client_id, body.client_secret);
      logger.debug("Captured client secret for token exchange", { clientId: body.client_id });
    }
    next();
  };
}

/**
 * Express middleware that captures redirect_uri from authorize requests
 * BEFORE the SDK validates it against the client's registered list.
 * This allows any MCP client (Claude, n8n, etc.) to connect without
 * pre-registering their callback URLs.
 */
export function captureRedirectUri(store: HaloClientsStore) {
  return (req: { query?: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const redirectUri = req.query?.redirect_uri;
    if (typeof redirectUri === "string" && redirectUri.length > 0) {
      store.addRedirectUri(redirectUri);
      logger.debug("Registered redirect URI", { redirectUri });
    }
    next();
  };
}

// ==================== PKCE INJECTION MIDDLEWARE ====================

/**
 * Base64url encode (RFC 7636)
 */
function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Express middleware that auto-injects PKCE parameters for clients that
 * don't send them (like n8n). The MCP SDK requires code_challenge + S256
 * per OAuth 2.1, but many standard OAuth2 clients don't support PKCE.
 *
 * When code_challenge is missing from the authorize request, this middleware:
 * 1. Generates a random code_verifier
 * 2. Computes code_challenge = base64url(SHA256(code_verifier))
 * 3. Injects both into req.query so the SDK accepts the request
 * 4. Stores the code_verifier so it can be injected into the token request
 */
export function injectPkceIfMissing() {
  return (req: { query?: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const query = req.query;
    if (query && !query.code_challenge) {
      const codeVerifier = base64url(randomBytes(32));
      const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

      query.code_challenge = codeChallenge;
      query.code_challenge_method = "S256";

      // Store the code_verifier keyed by client_id for later injection into /token
      const clientId = query.client_id as string;
      if (clientId) {
        generatedPkce.set(clientId, codeVerifier);
        logger.info("Auto-generated PKCE for non-PKCE client", { clientId });
      }
    }
    next();
  };
}

/**
 * Express middleware that injects the auto-generated code_verifier into
 * token requests for non-PKCE clients.
 */
export function injectPkceVerifier() {
  return (req: { body?: Record<string, unknown> }, _res: unknown, next: () => void) => {
    const body = req.body;
    if (body && typeof body.client_id === "string" && !body.code_verifier) {
      const storedVerifier = generatedPkce.get(body.client_id);
      if (storedVerifier) {
        body.code_verifier = storedVerifier;
        generatedPkce.delete(body.client_id);
        logger.debug("Injected auto-generated code_verifier for token exchange", { clientId: body.client_id });
      }
    }
    next();
  };
}

// ==================== PROVIDER ====================

export function createHaloOAuthProvider(haloBaseUrl: string): OAuthServerProvider & { clientsStore: HaloClientsStore } {
  const tokenUrl = `${haloBaseUrl}/auth/token`;
  const clientsStore = new HaloClientsStore();

  return {
    get clientsStore() {
      return clientsStore;
    },

    /**
     * Handle the authorization request from Claude.
     * Since Halo uses Client Credentials (no user interaction), we auto-approve
     * by generating an authorization code and redirecting back immediately.
     */
    async authorize(
      client: OAuthClientInformationFull,
      params: AuthorizationParams,
      res: Response
    ): Promise<void> {
      const code = randomUUID();

      // Dynamically allow this redirect_uri for future requests from any client
      clientsStore.addRedirectUri(params.redirectUri);

      pendingCodes.set(code, {
        clientId: client.client_id,
        codeChallenge: params.codeChallenge,
        redirectUri: params.redirectUri,
        scopes: params.scopes || ["all"],
        createdAt: Date.now(),
      });

      logger.info("Authorization code issued", {
        clientId: client.client_id,
        redirectUri: params.redirectUri,
      });

      const redirectUrl = new URL(params.redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (params.state) {
        redirectUrl.searchParams.set("state", params.state);
      }

      res.redirect(302, redirectUrl.toString());
    },

    /**
     * Return the code challenge for PKCE validation.
     */
    async challengeForAuthorizationCode(
      _client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<string> {
      const pending = pendingCodes.get(authorizationCode);
      if (!pending) {
        throw new Error("Invalid or expired authorization code");
      }
      return pending.codeChallenge;
    },

    /**
     * Exchange authorization code for tokens.
     * Uses the captured client_secret + client_id to call Halo with
     * grant_type=client_credentials.
     */
    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string,
      _codeVerifier?: string,
      _redirectUri?: string,
      _resource?: URL
    ): Promise<OAuthTokens> {
      const pending = pendingCodes.get(authorizationCode);
      if (!pending) {
        throw new Error("Invalid or expired authorization code");
      }

      pendingCodes.delete(authorizationCode);

      const clientId = pending.clientId;
      const clientSecret = capturedSecrets.get(clientId);

      // Clean up the captured secret
      capturedSecrets.delete(clientId);

      if (!clientSecret) {
        logger.error("No client_secret captured for token exchange", { clientId });
        throw new Error(
          "Client secret is required. Ensure you entered both Client ID and Client Secret in the connector settings."
        );
      }

      logger.info("Exchanging code for Halo token via Client Credentials", { clientId });

      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: pending.scopes.join(" ") || "all",
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Halo token request failed", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Halo token request failed (${response.status}): ${errorText}`);
      }

      const tokenData = await response.json() as Record<string, unknown>;

      logger.info("Halo token obtained successfully", {
        clientId,
        expiresIn: tokenData.expires_in,
      });

      return {
        access_token: tokenData.access_token as string,
        token_type: (tokenData.token_type as string) || "Bearer",
        expires_in: tokenData.expires_in as number | undefined,
        refresh_token: tokenData.refresh_token as string | undefined,
        scope: (tokenData.scope as string) || "all",
      };
    },

    /**
     * Refresh a token. Halo Client Credentials usually doesn't issue refresh tokens,
     * so we fall back to re-authenticating with Client Credentials.
     */
    async exchangeRefreshToken(
      client: OAuthClientInformationFull,
      refreshToken: string,
      scopes?: string[],
      _resource?: URL
    ): Promise<OAuthTokens> {
      const clientSecret = capturedSecrets.get(client.client_id);

      // Try refresh_token grant first
      if (clientSecret) {
        const body = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: client.client_id,
          client_secret: clientSecret,
          scope: scopes?.join(" ") || "all",
        });

        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (response.ok) {
          const tokenData = await response.json() as Record<string, unknown>;
          return {
            access_token: tokenData.access_token as string,
            token_type: (tokenData.token_type as string) || "Bearer",
            expires_in: tokenData.expires_in as number | undefined,
            refresh_token: tokenData.refresh_token as string | undefined,
            scope: (tokenData.scope as string) || "all",
          };
        }

        // Refresh failed, try Client Credentials as fallback
        logger.warn("Refresh token failed, falling back to Client Credentials");

        const fallbackBody = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: client.client_id,
          client_secret: clientSecret,
          scope: scopes?.join(" ") || "all",
        });

        const fallbackResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: fallbackBody.toString(),
        });

        if (fallbackResponse.ok) {
          const tokenData = await fallbackResponse.json() as Record<string, unknown>;
          return {
            access_token: tokenData.access_token as string,
            token_type: (tokenData.token_type as string) || "Bearer",
            expires_in: tokenData.expires_in as number | undefined,
            refresh_token: tokenData.refresh_token as string | undefined,
            scope: (tokenData.scope as string) || "all",
          };
        }
      }

      throw new Error("Token refresh failed and no client credentials available for fallback");
    },

    /**
     * Verify an access token by calling Halo's API.
     */
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const response = await fetch(`${haloBaseUrl}/api/Agent/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Invalid or expired Halo access token");
      }

      const agentData = await response.json() as Record<string, unknown>;
      logger.info("Token verified for agent", { agent: agentData.name as string });

      return {
        token,
        clientId: "halo-agent",
        scopes: ["all"],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      };
    },

    skipLocalPkceValidation: false,
  };
}
