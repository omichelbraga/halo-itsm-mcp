/**
 * Asset tools — wraps /Asset endpoint with TenantContext.
 * Includes: assets, asset-groups, asset-types, software-licences.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const assetTools: AdvntTool[] = [
  {
    name: 'halo_assets_list',
    description: 'List HaloITSM assets (CMDB). Filter by client, site, asset group/type, username, or linked asset. Returns paginated asset records.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Free-text search' },
        ticket_id: { type: 'number', description: 'Filter by assets on a ticket' },
        client_id: { type: 'number', description: 'Filter by client' },
        site_id: { type: 'number', description: 'Filter by site' },
        username: { type: 'string', description: 'Filter by username' },
        assetgroup_id: { type: 'number', description: 'Filter by asset group' },
        assettype_id: { type: 'number', description: 'Filter by asset type' },
        linkedto_id: { type: 'number', description: 'Filter by linked asset' },
        contract_id: { type: 'number', description: 'Filter by contract' },
        includeinactive: { type: 'boolean', description: 'Include inactive assets' },
        includeactive: { type: 'boolean', description: 'Include active assets' },
        includechildren: { type: 'boolean', description: 'Include child assets' },
        includedetails: { type: 'boolean', description: 'Include extra details' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Asset', params)
    },
  },
  {
    name: 'halo_assets_get',
    description: 'Get a single HaloITSM asset by ID, including full CMDB details.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The asset ID' },
        includedetails: { type: 'boolean', description: 'Include extra details and related objects' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.includedetails) params.includedetails = true
      return haloGet(ctx, env, `/Asset/${id}`, params)
    },
  },
  {
    name: 'halo_asset_groups_list',
    description: 'List HaloITSM asset groups (categories for organizing assets).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by name' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      return haloGet(ctx, env, '/AssetGroup', params)
    },
  },
]
