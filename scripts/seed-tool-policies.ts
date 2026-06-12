/**
 * scripts/seed-tool-policies.ts
 *
 * Seeds default halo_mcp_tool_policies for a tenant based on their plan tier.
 * Reads the tier baseline from config/tool-tiers.json and blocked list from
 * config/blocked-tools.json, then upserts rows in halo_mcp_tool_policies.
 *
 * Existing overrides (is_allowed=true for an above-tier tool) are preserved.
 * Only rows where the tool is in the tier baseline get touched by this script.
 *
 * Usage:
 *   tsx scripts/seed-tool-policies.ts <tenant_id> <plan_tier>
 *
 * plan_tier: starter | standard | professional | enterprise
 *
 * Options:
 *   --dry-run   Print what would be upserted without writing to DB
 *   --reset     Delete all existing policies for tenant first, then seed fresh
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import tierConfig from '../config/tool-tiers.json'
import blockedConfig from '../config/blocked-tools.json'

const TENANT_ID = process.argv[2]
const PLAN_TIER = process.argv[3] as 'starter' | 'standard' | 'professional' | 'enterprise' | undefined
const DRY_RUN = process.argv.includes('--dry-run')
const RESET = process.argv.includes('--reset')

if (!TENANT_ID || !PLAN_TIER) {
  console.error('Usage: tsx scripts/seed-tool-policies.ts <tenant_id> <plan_tier> [--dry-run] [--reset]')
  console.error('  plan_tier: starter | standard | professional | enterprise')
  process.exit(1)
}

const VALID_TIERS = ['starter', 'standard', 'professional', 'enterprise']
if (!VALID_TIERS.includes(PLAN_TIER)) {
  console.error(`Invalid plan_tier "${PLAN_TIER}". Must be one of: ${VALID_TIERS.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(
  process.env.ORION_SUPABASE_URL!,
  process.env.ORION_SUPABASE_SERVICE_ROLE_KEY!
)

function buildTierBaseline(planTier: string): string[] {
  const tiers = ['starter', 'standard', 'professional', 'enterprise']
  const idx = tiers.indexOf(planTier)
  const tools: string[] = []

  for (let i = 0; i <= idx; i++) {
    const t = tiers[i]
    const tierTools = (tierConfig as Record<string, string[]>)[t] ?? []
    if (tierTools.includes('__all_read_tools__')) {
      // Enterprise: all tools allowed — return sentinel
      return ['__all_read_tools__']
    }
    tools.push(...tierTools)
  }

  return [...new Set(tools)]
}

async function main() {
  console.log(`ADVNT-585 HaloITSM MCP — Seed Tool Policies`)
  console.log(`Tenant   : ${TENANT_ID}`)
  console.log(`Plan tier: ${PLAN_TIER}`)
  console.log(`Dry run  : ${DRY_RUN}`)
  console.log(`Reset    : ${RESET}`)

  const baseline = buildTierBaseline(PLAN_TIER)
  const blocked = new Set(blockedConfig.phase_1_blocked)
  const isEnterprise = baseline.includes('__all_read_tools__')

  // For enterprise, we treat all defined tools as allowed
  // Enumerate all tools mentioned across all tiers
  const allKnownTools = [
    ...new Set(
      Object.values(tierConfig as Record<string, string[]>)
        .flat()
        .filter(t => t !== '__all_read_tools__')
    ),
  ]

  const toolsToSeed = isEnterprise ? allKnownTools : baseline

  if (RESET && !DRY_RUN) {
    console.log('\nResetting existing policies...')
    const { error } = await supabase
      .from('halo_mcp_tool_policies')
      .delete()
      .eq('tenant_id', TENANT_ID)
    if (error) {
      console.error(`Failed to reset policies: ${error.message}`)
      process.exit(1)
    }
    console.log('Existing policies deleted.')
  }

  const rows = toolsToSeed.map(toolName => ({
    tenant_id: TENANT_ID,
    tool_name: toolName,
    // Phase-1-blocked tools are never allowed regardless of tier
    is_allowed: !blocked.has(toolName),
    plan_tier_granted: PLAN_TIER,
    is_default: true,
    created_by: 'seed-script',
  }))

  console.log(`\nTools to seed: ${rows.length}`)
  console.log(`  Allowed  : ${rows.filter(r => r.is_allowed).length}`)
  console.log(`  Blocked  : ${rows.filter(r => !r.is_allowed).length} (phase_1_blocked)`)

  if (DRY_RUN) {
    console.log('\n── Dry run — rows that would be upserted: ──')
    for (const row of rows) {
      const status = row.is_allowed ? '✓ allow' : '✗ block'
      console.log(`   ${status}  ${row.tool_name}`)
    }
    console.log('\nDry run complete. No changes written.')
    return
  }

  // Upsert in batches of 50
  const BATCH = 50
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('halo_mcp_tool_policies')
      .upsert(batch, { onConflict: 'tenant_id,tool_name', ignoreDuplicates: false })

    if (error) {
      console.error(`Upsert error (batch ${Math.floor(i / BATCH) + 1}): ${error.message}`)
      process.exit(1)
    }
    upserted += batch.length
  }

  console.log(`\n✓ Seeded ${upserted} policy rows for tenant ${TENANT_ID} (plan: ${PLAN_TIER})`)

  // Verify by reading back counts
  const { data: summary, error: readErr } = await supabase
    .from('halo_mcp_tool_policies')
    .select('is_allowed')
    .eq('tenant_id', TENANT_ID)

  if (!readErr && summary) {
    const allowed = summary.filter(r => r.is_allowed).length
    const denied = summary.filter(r => !r.is_allowed).length
    console.log(`   DB state: ${allowed} allowed, ${denied} blocked`)
  }
}

main()
