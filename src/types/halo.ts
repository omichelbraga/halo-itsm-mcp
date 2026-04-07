/**
 * Halo ITSM MCP Server - Halo API Types
 */

// Generic paginated response wrapper
export interface HaloListResponse<T = Record<string, unknown>> {
  record_count: number;
  records: T[];
}

// Pagination metadata returned by MCP tools
export interface PaginationMeta {
  total_count: number;
  page_size: number;
  page_no: number;
  total_pages: number;
  has_more: boolean;
}

// Advanced search filter
export interface AdvancedSearchFilter {
  filter_name: string;
  filter_type: number; // 0=IN, 1=NOT IN, 2==, 3=<>, 4=LIKE, 5=NOT LIKE, 6==, 7=>, 8=>=, 9=<, 10=<=
  filter_value: string;
}

// Rate limit state
export interface RateLimitState {
  requests: number[];   // timestamps of recent requests
  windowMs: number;     // sliding window size (300000 = 5 min)
  maxRequests: number;  // 700
}

// Common resource fields
export interface HaloTicket {
  id: number;
  summary: string;
  details: string;
  status_id: number;
  agent_id: number;
  client_id: number;
  site_id: number;
  user_id: number;
  priority_id: number;
  requesttype_id: number;
  team: string;
  [key: string]: unknown;
}

export interface HaloAction {
  id: number;
  ticket_id: number;
  who: string;
  note: string;
  [key: string]: unknown;
}

export interface HaloAgent {
  id: number;
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface HaloAsset {
  id: number;
  inventory_number: string;
  client_id: number;
  [key: string]: unknown;
}

export interface HaloClient {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface HaloUser {
  id: number;
  name: string;
  emailaddress: string;
  [key: string]: unknown;
}

export interface HaloSite {
  id: number;
  name: string;
  client_id: number;
  [key: string]: unknown;
}

// Generic record type for resources without specific interfaces
export type HaloRecord = Record<string, unknown>;
