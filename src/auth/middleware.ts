/**
 * Express auth shim (Node dev path).
 *
 * Same contract as middleware-worker.ts but for Express. All resolution lives
 * in @advnt/mcp-orion; this is glue + req-mutation.
 */
import { Request, Response, NextFunction } from 'express'
import { resolveTokenToTenant, type TenantContext, type CalledBy } from '@advnt/mcp-orion'
import { fromProcess } from '../types/env.js'

const CONNECTOR_SLUG = 'haloitsm'

export interface AuthenticatedRequest extends Request {
  tenantContext: TenantContext
  calledBy: CalledBy
  sessionId?: string
  requestedInstanceType: string
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' })
    return
  }
  const token = authHeader.slice(7)

  const requestedProjectId =
    (req.query['project_id'] as string | undefined) ??
    (req.headers['x-project-id'] as string | undefined)
  const requestedInstanceType =
    (req.query['instance_type'] as string | undefined) ??
    (req.headers['x-instance-type'] as string | undefined) ??
    'production'

  const env = fromProcess()

  try {
    const tenantContext = await resolveTokenToTenant(
      {
        token,
        connectorSlug: CONNECTOR_SLUG,
        requestedProjectId,
        requestedInstanceType,
      },
      env,
    )

    const authedReq = req as AuthenticatedRequest
    authedReq.tenantContext = tenantContext
    authedReq.requestedInstanceType = requestedInstanceType

    const callerHeader = req.headers['x-advnt-caller'] as string | undefined
    const ua = (req.headers['user-agent'] as string | undefined ?? '').toLowerCase()
    if (callerHeader) authedReq.calledBy = callerHeader as CalledBy
    else if (ua.includes('claude') || ua.includes('anthropic')) authedReq.calledBy = 'claude_desktop'
    else if (ua.includes('n8n')) authedReq.calledBy = 'n8n'
    else authedReq.calledBy = 'unknown'

    authedReq.sessionId = req.headers['x-session-id'] as string | undefined
    next()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    res.status(401).json({ error: message })
  }
}
