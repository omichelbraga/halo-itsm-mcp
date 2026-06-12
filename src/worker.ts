/// <reference types="@cloudflare/workers-types" />
/**
 * ADVNT HaloITSM MCP — Cloudflare Workers entry.
 * ADVNT-585 / L3b CLOUD.
 *
 * Stateless Streamable HTTP transport. Per-request:
 *   1. authMiddlewareWorker → TenantContext (via @advnt/mcp-orion)
 *   2. HaloAdapter constructed (vendor-thin; all shared infra in mcp-orion)
 *   3. policy gate via isToolAllowed (mcp_tool_policies)
 *   4. callTool() → audit via writeCallLog (mcp_call_logs)
 *
 * Credentials are resolved lazily by the shared OAuth strategy when a fresh
 * Halo token is needed. They never land in Worker env or on Connection rows.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  isToolAllowed,
  recordApprovalRequest,
  writeCallLog,
  type CallContext,
} from '@advnt/mcp-orion'
import { authMiddlewareWorker, detectCaller } from './auth/middleware-worker.js'
import { HaloAdapter } from './adapter.js'
import type { Env } from './types/env.js'

export type { Env }

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'orion-haloitsm-mcp',
        advnt_id: 'ADVNT-585',
        version: '0.2.0',
        timestamp: new Date().toISOString(),
      })
    }

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      const base = env.MCP_PUBLIC_URL
      return Response.json({
        issuer: base,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        registration_endpoint: `${base}/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
      })
    }

    if (url.pathname === '/mcp') {
      if (
        request.method !== 'POST' &&
        request.method !== 'GET' &&
        request.method !== 'DELETE'
      ) {
        return new Response('Method Not Allowed', { status: 405 })
      }

      // 1. Resolve tenant
      const authResult = await authMiddlewareWorker(request, env)
      if (authResult instanceof Response) return authResult
      const tenantCtx = authResult

      const calledBy = detectCaller(request)
      const sessionId = request.headers.get('x-session-id') ?? undefined
      const callCtx: CallContext = { tenant: tenantCtx, calledBy, sessionId }

      // 2. Build adapter (per-request — CF isolate model; tools are stateless)
      const adapter = new HaloAdapter(env)

      // 3. Build McpServer for this request
      const server = new McpServer({ name: 'orion-halo', version: '0.2.0' })

      for (const tool of adapter.listTools()) {
        server.tool(
          tool.name,
          tool.description,
          async (input: Record<string, unknown>) => {
            const start = Date.now()

            // Policy gate (meta tools bypass)
            if (!adapter.isAlwaysAvailable(tool.name)) {
              const decision = await isToolAllowed(
                tenantCtx.connectorId,
                tenantCtx,
                tool.name,
                env,
              )
              if (!decision.allowed) {
                void writeCallLog(
                  callCtx,
                  tenantCtx.connectorId,
                  {
                    toolName: tool.name,
                    status: 'blocked',
                    durationMs: Date.now() - start,
                    errorDetail: decision.reason,
                  },
                  env,
                )
                return {
                  content: [
                    { type: 'text' as const, text: JSON.stringify({ error: decision.reason }) },
                  ],
                  isError: true,
                }
              }
              if (decision.requiresApproval) {
                const requestId = await recordApprovalRequest(
                  callCtx,
                  tenantCtx.connectorId,
                  tool.name,
                  input,
                  env,
                )
                void writeCallLog(
                  callCtx,
                  tenantCtx.connectorId,
                  {
                    toolName: tool.name,
                    status: 'pending_approval',
                    durationMs: Date.now() - start,
                  },
                  env,
                )
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: JSON.stringify({
                        pending_approval: true,
                        request_id: requestId,
                        message:
                          'This action requires approval. Request recorded; an admin must approve in ORION before it executes.',
                      }),
                    },
                  ],
                }
              }
            }

            try {
              const result = await adapter.callTool(tool.name, input, callCtx)
              void writeCallLog(
                callCtx,
                tenantCtx.connectorId,
                {
                  toolName: tool.name,
                  status: 'success',
                  durationMs: Date.now() - start,
                },
                env,
              )
              return {
                content: [
                  { type: 'text' as const, text: JSON.stringify(result, null, 2) },
                ],
              }
            } catch (err: unknown) {
              const detail = err instanceof Error ? err.message : 'Unknown error'
              void writeCallLog(
                callCtx,
                tenantCtx.connectorId,
                {
                  toolName: tool.name,
                  status: 'error',
                  durationMs: Date.now() - start,
                  errorDetail: detail,
                },
                env,
              )
              return {
                content: [{ type: 'text' as const, text: JSON.stringify({ error: detail }) }],
                isError: true,
              }
            }
          },
        )
      }

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      })
      await server.connect(transport)
      return transport.handleRequest(request)
    }

    return new Response('Not Found', { status: 404 })
  },
}
