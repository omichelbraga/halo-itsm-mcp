/**
 * SLA tools — wraps SLA-related endpoints with TenantContext.
 * Includes: SLAs, statuses, priorities, service-status.
 * Phase 1: read-only (list).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const slaTools: AdvntTool[] = [
  {
    name: 'halo_slas_list',
    description: 'List HaloITSM SLA definitions (service level agreements with response and resolution targets).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by SLA name' },
        includedetails: { type: 'boolean', description: 'Include extra details' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/SLA', params)
    },
  },
  {
    name: 'halo_status_list',
    description: 'List HaloITSM ticket statuses (e.g. Open, In Progress, Waiting, Closed). Used for filtering and reporting.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by status name' },
        showall: { type: 'boolean', description: 'Include all statuses including hidden' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/Status', params)
    },
  },
  {
    name: 'halo_priorities_list',
    description: 'List HaloITSM priorities (urgency/impact levels for ticket classification).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by priority name' },
        includedetails: { type: 'boolean', description: 'Include extra details' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/Priority', params)
    },
  },
]
