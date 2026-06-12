/**
 * CF Workers auth shim.
 *
 * Takes Web Standard Request, resolves a TenantContext via @advnt/mcp-orion,
 * and returns it (or a 401 Response). All policy/credentials/audit live in
 * the shared package — this file is just glue.
 */
import {
  resolveTokenToTenant,
  type TenantContext,
  type CalledBy,
} from '@advnt/mcp-orion'
import type { Env } from '../types/env.js'

const CONNECTOR_SLUG = 'haloitsm'

export type { TenantContext, CalledBy }

export function detectCaller(request: Request): CalledBy {
  const callerHeader = request.headers.get('x-advnt-caller')
  if (callerHeader) return callerHeader as CalledBy

  const ua = (request.headers.get('user-agent') ?? '').toLowerCase()
  if (ua.includes('claude') || ua.includes('anthropic')) return 'claude_desktop'
  if (ua.includes('n8n')) return 'n8n'
  return 'unknown'
}

export async function authMiddlewareWorker(
  request: Request,
  env: Env,
): Promise<TenantContext | Response> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing Bearer token' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const url = new URL(request.url)
  const requestedProjectId =
    url.searchParams.get('project_id') ??
    request.headers.get('x-project-id') ??
    undefined
  const requestedInstanceType =
    url.searchParams.get('instance_type') ??
    request.headers.get('x-instance-type') ??
    'production'

  try {
    return await resolveTokenToTenant(
      {
        token,
        connectorSlug: CONNECTOR_SLUG,
        requestedProjectId,
        requestedInstanceType,
      },
      env,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    return Response.json({ error: message }, { status: 401 })
  }
}
