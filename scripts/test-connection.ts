/**
 * scripts/test-connection.ts
 *
 * End-to-end verification of the post-refactor path:
 *
 *   1. SELECT mcp_connections (haloitsm connector + active) for tenant
 *   2. Resolve credential via fn_get_mcp_credential RPC (vault-backed)
 *   3. OAuth client_credentials → Halo /auth/token (via shared strategy)
 *   4. Smoke GET /api/Tickets?count=1
 *   5. UPDATE mcp_connections.test_status
 *
 * Usage:
 *   tsx scripts/test-connection.ts [tenant_id] [connection_id]
 *
 * Defaults to the ADVNT sandbox tenant when no args given:
 *   ADVNT tenant     = 245a43a8-5cd9-4aeb-9d97-86895c814da8
 *   Halo sandbox     = 5d4487e5-9b7a-483b-8e5a-63bcc18b534e (tgdemo1)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import {
  resolveCredential,
  getOauthClientCredentialsToken,
  clearOauthTokenCache,
  writeCallLog,
  type Connection,
  type SupabaseEnv,
  type TenantContext,
  type CallContext,
} from '@advnt/mcp-orion'
import { HaloAdapter } from '../src/adapter.js'

const TENANT_ID = process.argv[2] ?? '245a43a8-5cd9-4aeb-9d97-86895c814da8'
const CONNECTION_ID = process.argv[3] ?? null
const CONNECTOR_SLUG = 'haloitsm'

const env: SupabaseEnv = {
  ORION_SUPABASE_URL: process.env.ORION_SUPABASE_URL!,
  ORION_SUPABASE_SERVICE_ROLE_KEY: process.env.ORION_SUPABASE_SERVICE_ROLE_KEY!,
  JWT_SECRET: process.env.JWT_SECRET ?? 'unused-by-this-script',
}

const supabase = createClient(env.ORION_SUPABASE_URL, env.ORION_SUPABASE_SERVICE_ROLE_KEY)

interface ConnRow {
  id: string
  connector_id: string
  tenant_id: string
  project_id: string | null
  instance_url: string
  auth_type: string
  vendor_config: Record<string, unknown>
  instance_type: string
  is_demo: boolean
  demo_expires_at: string | null
  display_name: string | null
  plan_tier: string
}

function toConnection(r: ConnRow): Connection {
  return {
    id: r.id,
    connectorId: r.connector_id,
    tenantId: r.tenant_id,
    projectId: r.project_id,
    instanceUrl: r.instance_url,
    authType: r.auth_type,
    vendorConfig: r.vendor_config ?? {},
    instanceType: r.instance_type,
    isDemo: r.is_demo,
    demoExpiresAt: r.demo_expires_at,
    displayName: r.display_name,
    planTier: r.plan_tier,
    projectName: null,
    projectType: null,
  }
}

async function markTestStatus(
  connectionId: string,
  status: string,
  detail: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('mcp_connections')
    .update({
      test_status: status,
      test_last_run_at: new Date().toISOString(),
      test_error_detail: detail,
    })
    .eq('id', connectionId)
  if (error) console.warn(`   ! Failed to update test_status: ${error.message}`)
}

async function testConnection(row: ConnRow): Promise<boolean> {
  const conn = toConnection(row)
  const label = conn.displayName ?? conn.projectId ?? conn.id
  console.log(`\n-- Testing connection: ${label} (${conn.id}) --`)
  console.log(`   Instance URL : ${conn.instanceUrl}`)
  console.log(`   Auth type    : ${conn.authType}`)
  console.log(`   Client ID    : ${conn.vendorConfig['client_id'] ?? '<missing>'}`)

  let secretLen = 0
  let secretLast4 = ''
  try {
    const secret = await resolveCredential(conn.id, env)
    secretLen = secret.length
    secretLast4 = secret.slice(-4)
    console.log(`   OK Credential resolved (len=${secretLen} last4=${secretLast4})`)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(`   X Credential resolve failed: ${reason}`)
    await markTestStatus(conn.id, 'secret_error', reason)
    return false
  }

  clearOauthTokenCache(conn.id)

  let token: string
  try {
    token = await getOauthClientCredentialsToken(
      conn,
      () => resolveCredential(conn.id, env),
      { tokenUrlTemplate: '{instance_url}/auth/token', tenantField: 'tenant' },
    )
    console.log(`   OK OAuth token acquired (len=${token.length})`)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(`   X OAuth exchange failed: ${reason}`)
    await markTestStatus(conn.id, 'auth_error', reason)
    return false
  }

  const smokeUrl = `${conn.instanceUrl.replace(/\/$/, '')}/api/Tickets?count=1`
  const smokeRes = await fetch(smokeUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!smokeRes.ok) {
    const reason = `Smoke GET /Tickets failed: HTTP ${smokeRes.status}`
    console.error(`   X ${reason}`)
    await markTestStatus(conn.id, 'api_error', reason)
    return false
  }
  console.log(`   OK Smoke test passed (GET /Tickets HTTP ${smokeRes.status})`)

  // 5. Adapter exercise — drive HaloAdapter.callTool through the full path
  //    that the worker uses, including writeCallLog into mcp_call_logs.
  const adapter = new HaloAdapter({
    ...env,
    MCP_PUBLIC_URL: 'http://localhost:3000',
  })
  const tenantCtx: TenantContext = {
    tenantId: conn.tenantId,
    tenantType: 'admin',
    planTier: 'enterprise',
    connectorId: conn.connectorId,
    connectorSlug: CONNECTOR_SLUG,
    activeConnection: conn,
    allConnections: [conn],
  }
  const callCtx: CallContext = {
    tenant: tenantCtx,
    calledBy: 'cowork',
    sessionId: 'COWORK-585-VERIFY',
  }

  const toolName = 'halo_tickets_list'
  const start = Date.now()
  try {
    await adapter.callTool(toolName, { page_size: 1 }, callCtx)
    const durationMs = Date.now() - start
    await writeCallLog(
      callCtx,
      conn.connectorId,
      { toolName, status: 'success', durationMs },
      env,
    )
    console.log(`   OK Adapter ${toolName} executed (durationMs=${durationMs})`)
  } catch (err) {
    const durationMs = Date.now() - start
    const detail = err instanceof Error ? err.message : String(err)
    await writeCallLog(
      callCtx,
      conn.connectorId,
      { toolName, status: 'error', durationMs, errorDetail: detail },
      env,
    )
    console.error(`   X Adapter ${toolName} failed: ${detail}`)
    await markTestStatus(conn.id, 'adapter_error', detail)
    return false
  }

  await markTestStatus(conn.id, 'ok', null)
  console.log(`   OK test_status updated -> ok`)
  return true
}

async function main(): Promise<void> {
  console.log(`ADVNT-585 HaloITSM MCP — Connection Test (post-refactor)`)
  console.log(`Tenant   : ${TENANT_ID}`)
  console.log(`Filter   : ${CONNECTION_ID ?? 'all active connections'}`)
  console.log(`Connector: ${CONNECTOR_SLUG}`)

  const { data: connector, error: cErr } = await supabase
    .from('mcp_connectors')
    .select('id, slug')
    .eq('slug', CONNECTOR_SLUG)
    .single()
  if (cErr || !connector) {
    console.error(`Unknown connector '${CONNECTOR_SLUG}': ${cErr?.message ?? 'not found'}`)
    process.exit(1)
  }

  let query = supabase
    .from('mcp_connections')
    .select(
      'id, connector_id, tenant_id, project_id, instance_url, auth_type, vendor_config, instance_type, is_demo, demo_expires_at, display_name, plan_tier',
    )
    .eq('tenant_id', TENANT_ID)
    .eq('connector_id', connector.id)
    .eq('is_active', true)

  if (CONNECTION_ID) query = query.eq('id', CONNECTION_ID)

  const { data: rows, error } = await query
  if (error) {
    console.error(`Error fetching connections: ${error.message}`)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.error(`No active connections for tenant ${TENANT_ID} on connector ${CONNECTOR_SLUG}`)
    process.exit(1)
  }

  console.log(`Found ${rows.length} connection(s)`)

  let passed = 0
  let failed = 0
  for (const row of rows as ConnRow[]) {
    try {
      if (await testConnection(row)) passed++
      else failed++
    } catch (err) {
      console.error(`   X Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  console.log(`\n-- Summary --`)
  console.log(`   Passed : ${passed}`)
  console.log(`   Failed : ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
