/**
 * HaloITSM API client.
 *
 * Token acquisition + caching live in @advnt/mcp-orion's
 * getOauthClientCredentialsToken. Secrets are resolved lazily via
 * resolveCredential — never carried on the Connection object.
 *
 * This module owns the Halo URL shape only ({instance_url}/api{path}).
 */
import {
  getOauthClientCredentialsToken,
  resolveCredential,
  type TenantContext,
} from '@advnt/mcp-orion'
import type { Env } from '../types/env.js'

async function getHaloToken(ctx: TenantContext, env: Env): Promise<string> {
  const conn = ctx.activeConnection
  if (!conn) throw new Error('No active Halo connection.')
  return getOauthClientCredentialsToken(
    conn,
    () => resolveCredential(conn.id, env),
    {
      tokenUrlTemplate: '{instance_url}/auth/token',
      tenantField: 'tenant',
    },
  )
}

export async function haloGet<T>(
  ctx: TenantContext,
  env: Env,
  path: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  const conn = ctx.activeConnection
  if (!conn) {
    throw new Error(
      'No active Halo connection. ' +
        (ctx.tenantType === 'partner'
          ? 'Specify a project — e.g. "For the Acme project, show open tickets"'
          : 'Configure your Halo instance in ORION → Connect → HaloITSM MCP'),
    )
  }

  const token = await getHaloToken(ctx, env)
  const base = conn.instanceUrl.replace(/\/$/, '')
  const url = new URL(`${base}/api${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Halo API error ${res.status} at ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}
