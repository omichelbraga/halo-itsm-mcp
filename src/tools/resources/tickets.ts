/**
 * Tickets - Core ITSM resource
 * Endpoint: /Tickets
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const ticketsConfig: ResourceConfig = {
  name: "tickets",
  apiPath: "/Tickets",
  description: "ticket",
  readPermission: "User, Ticket Read",
  writePermission: "User (create), Agent Ticket Modify (update/delete)",
  listParams: {
    // ID-only mode
    ticketidonly: z.boolean().optional().describe("Return only ID fields (Ticket ID, SLA ID, Status ID, Client ID). Not compatible with pagination."),

    // View / column profiles
    view_id: z.number().int().optional().describe("Filter profile ID to apply"),
    columns_id: z.number().int().optional().describe("Column profile ID"),
    includecolumns: z.boolean().optional().describe("Include column details in response"),

    // SLA and time
    includeslaactiondate: z.boolean().optional().describe("Include SLA action date"),
    includeslatimer: z.boolean().optional().describe("Include SLA timer"),
    includetimetaken: z.boolean().optional().describe("Include time taken"),
    includefirstresponse: z.boolean().optional().describe("Include first response data"),

    // Related data
    includesupplier: z.boolean().optional().describe("Include supplier details"),
    includerelease1: z.boolean().optional().describe("Include release 1 details"),
    includerelease2: z.boolean().optional().describe("Include release 2 details"),
    includerelease3: z.boolean().optional().describe("Include release 3 details"),
    includechildids: z.boolean().optional().describe("Include child ticket IDs"),
    includenextactivitydate: z.boolean().optional().describe("Include next activity date"),
    include_custom_fields: z.string().optional().describe("Comma-separated list of custom field IDs to include"),

    // Single-value filters
    list_id: z.number().int().optional().describe("Filter by list ID"),
    agent_id: z.number().int().optional().describe("Filter by agent ID"),
    status_id: z.number().int().optional().describe("Filter by status ID"),
    requesttype_id: z.number().int().optional().describe("Filter by request type ID"),
    supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    site: z.number().int().optional().describe("Filter by site ID"),
    user_id: z.number().int().optional().describe("Filter by user ID"),
    username: z.string().optional().describe("Filter by username"),
    release_id: z.number().int().optional().describe("Filter by release ID"),
    asset_id: z.number().int().optional().describe("Filter by asset ID"),
    itil_requesttype_id: z.number().int().optional().describe("Filter by ITIL request type ID"),
    contract_id: z.number().int().optional().describe("Filter by contract ID"),

    // Boolean filters
    open_only: z.boolean().optional().describe("Return only open tickets"),
    closed_only: z.boolean().optional().describe("Return only closed tickets"),
    unlinked_only: z.boolean().optional().describe("Return only unlinked tickets"),
    withattachments: z.boolean().optional().describe("Return only tickets with attachments"),

    // Array filters
    team: z.array(z.number().int()).optional().describe("Filter by team IDs"),
    agent: z.array(z.number().int()).optional().describe("Filter by agent IDs"),
    status: z.array(z.number().int()).optional().describe("Filter by status IDs"),
    requesttype: z.array(z.number().int()).optional().describe("Filter by request type IDs"),
    itil_requesttype: z.array(z.number().int()).optional().describe("Filter by ITIL request type IDs"),
    category_1: z.array(z.number().int()).optional().describe("Filter by category 1 IDs"),
    category_2: z.array(z.number().int()).optional().describe("Filter by category 2 IDs"),
    category_3: z.array(z.number().int()).optional().describe("Filter by category 3 IDs"),
    category_4: z.array(z.number().int()).optional().describe("Filter by category 4 IDs"),
    sla: z.array(z.number().int()).optional().describe("Filter by SLA IDs"),
    priority: z.array(z.number().int()).optional().describe("Filter by priority IDs"),
    products: z.array(z.number().int()).optional().describe("Filter by product IDs"),
    flagged: z.array(z.number().int()).optional().describe("Filter by flagged ticket IDs"),
    excludethese: z.array(z.number().int()).optional().describe("Exclude these ticket IDs"),

    // Date search
    datesearch: z.string().optional().describe("Date field to search (e.g., 'dateoccured' for opened, 'datecleared' for closed)"),
    startdate: z.string().optional().describe("Start date for date range filter"),
    enddate: z.string().optional().describe("End date for date range filter"),

    // Text searches
    searchactions: z.boolean().optional().describe("Also search within ticket actions"),
    search_user_name: z.string().optional().describe("Search by user name"),
    search_summary: z.string().optional().describe("Search by ticket summary"),
    search_details: z.string().optional().describe("Search by ticket details"),
    search_reportedby: z.string().optional().describe("Search by reportedby field"),
    search_version: z.string().optional().describe("Search by software version"),
    search_release1: z.string().optional().describe("Search by release 1"),
    search_release2: z.string().optional().describe("Search by release 2"),
    search_release3: z.string().optional().describe("Search by release 3"),
    search_releasenote: z.string().optional().describe("Search by release note"),
    search_inventory_number: z.string().optional().describe("Search by asset tag/inventory number"),
    search_oppcontactname: z.string().optional().describe("Search by opportunity contact name"),
    search_oppcompanyname: z.string().optional().describe("Search by opportunity company name"),

    // Advanced search
    advanced_search: z.array(z.object({
      filter_name: z.string(),
      filter_type: z.number().int().min(0).max(10),
      filter_value: z.string(),
    })).optional().describe("Advanced search filters array. filter_type: 0=IN, 1=NOT IN, 2==, 3=<>, 4=LIKE, 5=NOT LIKE, 7=>, 8=>=, 9=<, 10=<="),
  },
  getParams: {
    includedetails: z.boolean().optional().describe("Include extra objects in response"),
    includelastaction: z.boolean().optional().describe("Include last action in response"),
    ticketidonly: z.boolean().optional().describe("Return only ID fields"),
  },
  deleteParams: {
    reason: z.string().optional().describe("Reason for ticket deletion"),
  },
};
