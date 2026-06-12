/**
 * Express MCP router (Node dev path).
 *
 * Mirrors src/worker.ts on the Node side. Session-stateful (transport map),
 * since the local dev process is long-lived. All policy / credential / audit
 * paths route through @advnt/mcp-orion.
 */
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import {
  isToolAllowed,
  recordApprovalRequest,
  writeCallLog,
  type CallContext,
} from '@advnt/mcp-orion'
import { authMiddleware, type AuthenticatedRequest } from './auth/middleware.js'
import { HaloAdapter } from './adapter.js'
import { fromProcess } from './types/env.js'
import type { Request, Response } from 'express'

const transports = new Map<string, StreamableHTTPServerTransport>()

function buildMcpServer(req: AuthenticatedRequest): McpServer {
  const env = fromProcess()
  const tenant = req.tenantContext
  const callCtx: CallContext = {
    tenant,
    calledBy: req.calledBy,
    sessionId: req.sessionId,
  }
  const adapter = new HaloAdapter(env)

  const server = new McpServer({ name: 'orion-halo', version: '0.2.0' })

  for (const tool of adapter.listTools()) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema as Record<string, unknown>,
      async (input: Record<string, unknown>) => {
        const start = Date.now()

        if (!adapter.isAlwaysAvailable(tool.name)) {
          const decision = await isToolAllowed(tenant.connectorId, tenant, tool.name, env)
          if (!decision.allowed) {
            void writeCallLog(
              callCtx,
              tenant.connectorId,
              {
                toolName: tool.name,
                status: 'blocked',
                durationMs: Date.now() - start,
                errorDetail: decision.reason,
              },
              env,
            )
            return {
              content: [{ type: 'text', text: JSON.stringify({ error: decision.reason }) }],
              isError: true,
            }
          }
          if (decision.requiresApproval) {
            const requestId = await recordApprovalRequest(
              callCtx,
              tenant.connectorId,
              tool.name,
              input,
              env,
            )
            void writeCallLog(
              callCtx,
              tenant.connectorId,
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
                  type: 'text',
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
            tenant.connectorId,
            {
              toolName: tool.name,
              status: 'success',
              durationMs: Date.now() - start,
            },
            env,
          )
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          }
        } catch (err: unknown) {
          const detail = err instanceof Error ? err.message : 'Unknown error'
          void writeCallLog(
            callCtx,
            tenant.connectorId,
            {
              toolName: tool.name,
              status: 'error',
              durationMs: Date.now() - start,
              errorDetail: detail,
            },
            env,
          )
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: detail }) }],
            isError: true,
          }
        }
      },
    )
  }

  return server
}

export function createMcpRouter(): Router {
  const router = Router()
  router.use(authMiddleware)

  router.post('/', async (req: Request, res: Response) => {
    const authedReq = req as AuthenticatedRequest
    const sessionId = req.headers['mcp-session-id'] as string | undefined

    try {
      let transport: StreamableHTTPServerTransport
      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!
      } else if (isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            transports.set(sid, transport)
          },
        })
        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid) transports.delete(sid)
        }
        const server = buildMcpServer(authedReq)
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        return
      } else {
        const status = sessionId ? 404 : 400
        const message = sessionId
          ? 'Session not found — please re-initialize'
          : 'Bad Request: missing session ID'
        res.status(status).json({
          jsonrpc: '2.0',
          error: { code: -32000, message },
          id: null,
        })
        return
      }
      await transport.handleRequest(req, res, req.body)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      console.error('[MCP] POST error:', message)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message },
          id: null,
        })
      }
    }
  })

  router.get('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !transports.has(sessionId)) {
      res.status(sessionId ? 404 : 400).send('Invalid or missing session ID')
      return
    }
    await transports.get(sessionId)!.handleRequest(req, res)
  })

  router.delete('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !transports.has(sessionId)) {
      res.status(sessionId ? 404 : 400).send('Invalid or missing session ID')
      return
    }
    await transports.get(sessionId)!.handleRequest(req, res)
  })

  return router
}
