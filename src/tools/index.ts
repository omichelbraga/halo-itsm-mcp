/**
 * Tool registry — vendor-side. Each entry is a thin descriptor that the
 * HaloAdapter dispatches in callTool(). TenantContext + Env are threaded in
 * by the worker (CF Workers per-request isolate model).
 */
import type { TenantContext } from '@advnt/mcp-orion'
import type { Env } from '../types/env.js'
import { ticketTools } from './tickets.js'
import { assetTools } from './assets.js'
import { clientTools } from './clients.js'
import { userTools } from './users.js'
import { slaTools } from './sla.js'
import { projectTools } from './projects.js'
import { reportTools } from './reports.js'
import { knowledgeTools } from './knowledge.js'
import { metaTools } from './meta.js'

export interface AdvntTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (
    input: Record<string, unknown>,
    ctx: TenantContext,
    env: Env,
  ) => Promise<unknown>
  /** Bypasses plan tier + per-tenant policy gate (used by meta tools). */
  alwaysAvailable?: boolean
}

export function getAllTools(): AdvntTool[] {
  return [
    ...metaTools,
    ...ticketTools,
    ...assetTools,
    ...clientTools,
    ...userTools,
    ...slaTools,
    ...projectTools,
    ...reportTools,
    ...knowledgeTools,
  ]
}
