/**
 * Client tools — wraps /Client endpoint with TenantContext.
 * Includes: clients (customers), organisations, sites, contracts.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const clientTools: AdvntTool[] = [
  {
    name: 'halo_clients_list',
    description: 'List HaloITSM clients (customers). Filter by top-level, active/inactive status. Returns paginated client records.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Free-text search' },
        toplevel_id: { type: 'number', description: 'Filter by top-level customer' },
        includeinactive: { type: 'boolean', description: 'Include inactive customers' },
        includeactive: { type: 'boolean', description: 'Include active customers' },
        include_website: { type: 'boolean', description: 'Include website field' },
        includedetails: { type: 'boolean', description: 'Include extra objects' },
        includeactivity: { type: 'boolean', description: 'Include ticket activity' },
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
      return haloGet(ctx, env, '/Client', params)
    },
  },
  {
    name: 'halo_clients_get',
    description: 'Get a single HaloITSM client (customer) by ID, including full details and contacts.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The client ID' },
        includedetails: { type: 'boolean', description: 'Include extra objects' },
        includeactivity: { type: 'boolean', description: 'Include ticket activity' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.includedetails) params.includedetails = true
      if (input.includeactivity) params.includeactivity = true
      return haloGet(ctx, env, `/Client/${id}`, params)
    },
  },
  {
    name: 'halo_sites_list',
    description: 'List HaloITSM sites (physical locations associated with clients).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by site name' },
        client_id: { type: 'number', description: 'Filter by client' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/Site', params)
    },
  },
]
