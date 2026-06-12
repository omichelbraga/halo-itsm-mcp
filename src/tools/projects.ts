/**
 * Project tools — wraps /Projects endpoint with TenantContext.
 * Includes: projects, timesheets, workflows.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const projectTools: AdvntTool[] = [
  {
    name: 'halo_projects_list',
    description: 'List HaloITSM projects. Filter by agent, client, status, priority, category, or date range. Supports full-text search on summary and details.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Free-text search' },
        agent_id: { type: 'number', description: 'Filter by agent' },
        status_id: { type: 'number', description: 'Filter by status' },
        client_id: { type: 'number', description: 'Filter by client' },
        open_only: { type: 'boolean', description: 'Only open projects' },
        closed_only: { type: 'boolean', description: 'Only closed projects' },
        startdate: { type: 'string', description: 'Start date for date range' },
        enddate: { type: 'string', description: 'End date for date range' },
        datesearch: { type: 'string', description: 'Date field to search' },
        search_summary: { type: 'string', description: 'Search by project summary' },
        search_details: { type: 'string', description: 'Search by project details' },
        order: { type: 'string', description: 'Field to sort by' },
        orderdesc: { type: 'boolean', description: 'Sort descending' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Projects', params)
    },
  },
  {
    name: 'halo_projects_get',
    description: 'Get a single HaloITSM project by ID, including tasks and related objects.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The project ID' },
        includedetails: { type: 'boolean', description: 'Include extra objects and tasks' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      const params: Record<string, string | number | boolean> = {}
      if (input.includedetails) params.includedetails = true
      return haloGet(ctx, env, `/Projects/${id}`, params)
    },
  },
  {
    name: 'halo_timesheets_list',
    description: 'List HaloITSM timesheet entries (time logged against tickets and projects).',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Free-text search' },
        ticket_id: { type: 'number', description: 'Filter by ticket' },
        agent_id: { type: 'number', description: 'Filter by agent' },
        client_id: { type: 'number', description: 'Filter by client' },
        startdate: { type: 'string', description: 'Start date' },
        enddate: { type: 'string', description: 'End date' },
      },
    },
    execute: async (input, ctx, env) => {
      const params: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v as string | number | boolean
      }
      if (!params.page_size) params.page_size = 50
      if (!params.page_no) params.page_no = 1
      return haloGet(ctx, env, '/Timesheets', params)
    },
  },
]
