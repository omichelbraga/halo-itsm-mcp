/**
 * Ticket tools — wraps /Tickets endpoint with TenantContext.
 * Includes: tickets, actions (ticket actions/notes), ticket-types, ticket-rules.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const ticketTools: AdvntTool[] = [
  {
    name: 'halo_tickets_list',
    description: 'List and search HaloITSM tickets. Supports pagination, filtering by status/agent/client/priority/team, date ranges, and full-text search. Returns paginated ticket records.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number (default 1)' },
        search: { type: 'string', description: 'Free-text search string' },
        open_only: { type: 'boolean', description: 'Return only open tickets' },
        closed_only: { type: 'boolean', description: 'Return only closed tickets' },
        agent_id: { type: 'number', description: 'Filter by agent ID' },
        client_id: { type: 'number', description: 'Filter by client ID' },
        status_id: { type: 'number', description: 'Filter by status ID' },
        user_id: { type: 'number', description: 'Filter by user ID' },
        asset_id: { type: 'number', description: 'Filter by asset ID' },
        startdate: { type: 'string', description: 'Start date for date range filter (e.g. 2024-01-01)' },
        enddate: { type: 'string', description: 'End date for date range filter' },
        datesearch: { type: 'string', description: 'Date field to search (e.g. dateoccured, datecleared)' },
        search_summary: { type: 'string', description: 'Search by ticket summary' },
        search_details: { type: 'string', description: 'Search by ticket details' },
        order: { type: 'string', description: 'Field to sort by' },
        orderdesc: { type: 'boolean', description: 'Sort descending (default true)' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      if (params.pageinate === undefined) params.pageinate = true
      return haloGet(ctx, env, '/Tickets', params)
    },
  },
  {
    name: 'halo_tickets_get',
    description: 'Get a single HaloITSM ticket by ID, including full details, last action, and related objects.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The ticket ID' },
        includedetails: { type: 'boolean', description: 'Include extra objects in response' },
        includelastaction: { type: 'boolean', description: 'Include last action in response' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.includedetails) params.includedetails = true
      if (input.includelastaction) params.includelastaction = true
      return haloGet(ctx, env, `/Tickets/${id}`, params)
    },
  },
  {
    name: 'halo_actions_list',
    description: 'List actions (notes, updates, replies) on HaloITSM tickets. Filter by ticket_id to get all actions for a specific ticket.',
    inputSchema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'number', description: 'Filter by ticket ID' },
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search within action text' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Actions', params)
    },
  },
]
