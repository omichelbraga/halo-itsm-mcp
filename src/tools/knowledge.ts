/**
 * Knowledge base tools — wraps /KBArticle endpoint with TenantContext.
 * Phase 1: read-only (list + get).
 */
import { AdvntTool } from './index'
import { haloGet } from '../halo/client'

export const knowledgeTools: AdvntTool[] = [
  {
    name: 'halo_knowledgebase_list',
    description: 'List HaloITSM knowledge base articles. Returns article titles and metadata. Use halo_knowledgebase_get to fetch full content.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page (max 100, default 50)' },
        page_no: { type: 'number', description: 'Page number' },
        search: { type: 'string', description: 'Search by article title or content' },
        category_id: { type: 'number', description: 'Filter by KB category' },
        client_id: { type: 'number', description: 'Filter by client (for client-specific articles)' },
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
      return haloGet(ctx, env, '/KBArticle', params)
    },
  },
  {
    name: 'halo_knowledgebase_get',
    description: 'Get a single HaloITSM knowledge base article by ID, including full content.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'number', description: 'The KB article ID' },
      },
    },
    execute: async (input, ctx, env) => {
      const id = input.id as number
      return haloGet(ctx, env, `/KBArticle/${id}`)
    },
  },
]
