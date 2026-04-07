/**
 * Halo ITSM MCP Server - Resource Tool Factory
 *
 * Generates standardized MCP tool definitions and handlers for Halo API resources.
 * Each resource gets up to 4 tools: list, get, upsert, delete.
 * Resources can also define additional custom tools.
 */

import { z, ZodObject, ZodRawShape } from "zod";
import { HaloClient } from "../client/halo-client.js";
import { PaginationMeta } from "../types/halo.js";

// Tool definition for MCP registration
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// Resource configuration
export interface ResourceConfig {
  /** MCP tool name prefix (e.g., "tickets" -> halo_tickets_list) */
  name: string;
  /** Halo API endpoint path (e.g., "/Tickets") */
  apiPath: string;
  /** Human-readable resource description */
  description: string;
  /** Halo permission required for read operations */
  readPermission: string;
  /** Halo permission required for write operations */
  writePermission: string;
  /** Additional Zod schema fields for the list operation */
  listParams?: ZodRawShape;
  /** Additional Zod schema fields for the get operation */
  getParams?: ZodRawShape;
  /** Additional Zod schema fields for upsert body */
  upsertFields?: ZodRawShape;
  /** Additional Zod schema fields for delete */
  deleteParams?: ZodRawShape;
  /** Disable specific operations */
  disableOps?: Array<"list" | "get" | "upsert" | "delete">;
  /** Custom tools beyond CRUD */
  customTools?: ToolDefinition[];
}

// Common pagination params shared by all list tools
const paginationSchema = {
  page_size: z.number().int().min(1).max(100).optional().describe("Results per page (max 100, default 50)"),
  page_no: z.number().int().min(1).optional().describe("Page number (default 1)"),
  order: z.string().optional().describe("Field name to sort by"),
  orderdesc: z.boolean().optional().describe("Sort descending (default true)"),
  search: z.string().max(500).optional().describe("Free-text search string"),
  pageinate: z.boolean().optional().default(true).describe("Enable pagination (default true)"),
};

/**
 * Build pagination metadata from a Halo list response.
 */
function buildPaginationMeta(totalCount: number, pageSize: number, pageNo: number): PaginationMeta {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    total_count: totalCount,
    page_size: pageSize,
    page_no: pageNo,
    total_pages: totalPages,
    has_more: pageNo < totalPages,
  };
}

/**
 * Format a tool result as JSON text content.
 */
function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Generate all CRUD tool definitions for a resource.
 */
export function createResourceTools(config: ResourceConfig, client: HaloClient): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  const disabled = config.disableOps || [];

  // --- LIST ---
  if (!disabled.includes("list")) {
    const listSchemaShape: ZodRawShape = {
      ...paginationSchema,
      ...(config.listParams || {}),
    };

    tools.push({
      name: `halo_${config.name}_list`,
      description: `List/search ${config.description}. Supports pagination, sorting, and filtering. Halo permission: ${config.readPermission}.`,
      inputSchema: z.object(listSchemaShape),
      handler: async (args: Record<string, unknown>) => {
        try {
          const params: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) {
              params[key] = value;
            }
          }
          if (!params.pageinate) params.pageinate = true;
          if (!params.page_size) params.page_size = 50;
          if (!params.page_no) params.page_no = 1;

          const response = await client.list(config.apiPath, params);
          if (!response.ok) {
            return errorResult(`Failed to list ${config.description}: HTTP ${response.status}`);
          }

          const data = response.data as Record<string, unknown>;
          const recordCount = (data.record_count as number) || 0;
          const records = (data.records as unknown[]) || data;

          const pagination = buildPaginationMeta(
            recordCount,
            (params.page_size as number) || 50,
            (params.page_no as number) || 1
          );

          return successResult({ pagination, records });
        } catch (err) {
          return errorResult(`${(err as Error).message}`);
        }
      },
    });
  }

  // --- GET ---
  if (!disabled.includes("get")) {
    const getSchemaShape: ZodRawShape = {
      id: z.number().int().describe(`The ${config.description} ID`),
      includedetails: z.boolean().optional().describe("Include related sub-objects in the response"),
      ...(config.getParams || {}),
    };

    tools.push({
      name: `halo_${config.name}_get`,
      description: `Get a single ${config.description} by ID. Halo permission: ${config.readPermission}.`,
      inputSchema: z.object(getSchemaShape),
      handler: async (args: Record<string, unknown>) => {
        try {
          const id = args.id as number;
          const params: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(args)) {
            if (key !== "id" && value !== undefined && value !== null) {
              params[key] = value;
            }
          }
          const response = await client.get(config.apiPath, id, params);
          if (!response.ok) {
            return errorResult(`Failed to get ${config.description} #${id}: HTTP ${response.status}`);
          }
          return successResult(response.data);
        } catch (err) {
          return errorResult(`${(err as Error).message}`);
        }
      },
    });
  }

  // --- UPSERT (Create or Update) ---
  if (!disabled.includes("upsert")) {
    const upsertSchemaShape: ZodRawShape = {
      data: z.record(z.unknown()).refine(
        (obj) => JSON.stringify(obj).length <= 512_000,
        { message: "Data object too large (max 512KB when serialized)" }
      ).describe(
        `The ${config.description} data object. Include 'id' field to update an existing record, omit 'id' to create new.`
      ),
      ...(config.upsertFields || {}),
    };

    tools.push({
      name: `halo_${config.name}_upsert`,
      description: `Create or update ${config.description}. If 'id' is included in data, updates the existing record; otherwise creates new. Halo permission: ${config.writePermission}.`,
      inputSchema: z.object(upsertSchemaShape),
      handler: async (args: Record<string, unknown>) => {
        try {
          const body = args.data;
          const response = await client.post(config.apiPath, body);
          if (!response.ok) {
            return errorResult(`Failed to upsert ${config.description}: HTTP ${response.status}`);
          }
          return successResult(response.data);
        } catch (err) {
          return errorResult(`${(err as Error).message}`);
        }
      },
    });
  }

  // --- DELETE ---
  if (!disabled.includes("delete")) {
    const deleteSchemaShape: ZodRawShape = {
      id: z.number().int().describe(`The ${config.description} ID to delete`),
      ...(config.deleteParams || {}),
    };

    tools.push({
      name: `halo_${config.name}_delete`,
      description: `Delete a ${config.description} by ID. Halo permission: ${config.writePermission}.`,
      inputSchema: z.object(deleteSchemaShape),
      handler: async (args: Record<string, unknown>) => {
        try {
          const id = args.id as number;
          const params: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(args)) {
            if (key !== "id" && value !== undefined && value !== null) {
              params[key] = value;
            }
          }
          const response = await client.delete(config.apiPath, id, params);
          if (!response.ok) {
            return errorResult(`Failed to delete ${config.description} #${id}: HTTP ${response.status}`);
          }
          return successResult({ success: true, message: `${config.description} #${id} deleted.` });
        } catch (err) {
          return errorResult(`${(err as Error).message}`);
        }
      },
    });
  }

  // --- CUSTOM TOOLS ---
  if (config.customTools) {
    tools.push(...config.customTools);
  }

  return tools;
}
