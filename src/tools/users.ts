/**
 * User tools — wraps /Users endpoint with TenantContext.
 * Includes: users (end-users/contacts), agents, teams.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const userTools: AdvntTool[] = [
  {
    name: 'halo_users_list',
    description: 'List HaloITSM users (end users / contacts). Filter by client, site, department, or search by phone/name. Returns paginated user records.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Free-text search' },
        client_id: { type: 'number', description: 'Filter by customer/client' },
        site_id: { type: 'number', description: 'Filter by site' },
        organisation_id: { type: 'number', description: 'Filter by organisation' },
        department_id: { type: 'number', description: 'Filter by department' },
        toplevel_id: { type: 'number', description: 'Filter by top level' },
        asset_id: { type: 'number', description: 'Filter by assigned asset' },
        search_phonenumbers: { type: 'string', description: 'Search by phone number' },
        includeactive: { type: 'boolean', description: 'Include active users' },
        includeinactive: { type: 'boolean', description: 'Include inactive users' },
        excludeagents: { type: 'boolean', description: 'Exclude users linked to agents' },
        approvalsonly: { type: 'boolean', description: 'Only users that can approve' },
        includedetails: { type: 'boolean', description: 'Include extra objects' },
        count: { type: 'number', description: 'Number of results (when not paginating)' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Users', params)
    },
  },
  {
    name: 'halo_users_get',
    description: 'Get a single HaloITSM user by ID, including contact details and ticket activity.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The user ID' },
        includedetails: { type: 'boolean', description: 'Include extra objects' },
        includeactivity: { type: 'boolean', description: 'Include ticket activity' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.includedetails) params.includedetails = true
      if (input.includeactivity) params.includeactivity = true
      return haloGet(ctx, env, `/Users/${id}`, params)
    },
  },
  {
    name: 'halo_teams_list',
    description: 'List HaloITSM teams (groups of agents used for ticket routing and assignment).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by team name' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/Team', params)
    },
  },
]
