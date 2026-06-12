/**
 * Report tools — wraps /Report endpoint with TenantContext.
 * Includes: reports, audit log.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const reportTools: AdvntTool[] = [
  {
    name: 'halo_reports_list',
    description: 'List available HaloITSM reports. Filter by ticket, client, site, user, or report group. Returns report metadata (use halo_reports_get with loadreport=true to execute).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by report name' },
        ticket_id: { type: 'number', description: 'Filter by ticket ID' },
        client_id: { type: 'number', description: 'Filter by client ID' },
        site_id: { type: 'number', description: 'Filter by site ID' },
        user_id: { type: 'number', description: 'Filter by user ID' },
        report_group_id: { type: 'number', description: 'Filter by report group ID' },
        chartsonly: { type: 'boolean', description: 'Only return chart reports' },
        count: { type: 'number', description: 'Number of results' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Report', params)
    },
  },
  {
    name: 'halo_reports_get',
    description: 'Get a HaloITSM report by ID. Set loadreport=true to execute the report and return computed data.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The report ID' },
        loadreport: { type: 'boolean', description: 'Set to true to include computed report data in the response' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.loadreport) params.loadreport = true
      return haloGet(ctx, env, `/Report/${id}`, params)
    },
  },
]
