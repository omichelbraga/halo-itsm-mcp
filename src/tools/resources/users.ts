/**
 * Users - End users / customers
 * Endpoint: /Users
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const usersConfig: ResourceConfig = {
  name: "users",
  apiPath: "/Users",
  description: "user (end user)",
  readPermission: "Agent, Customers Read",
  writePermission: "Agent, Customers Modify",
  listParams: {
    client_id: z.number().int().optional().describe("Filter by customer/client"),
    site_id: z.number().int().optional().describe("Filter by site"),
    organisation_id: z.number().int().optional().describe("Filter by organisation"),
    department_id: z.number().int().optional().describe("Filter by department"),
    toplevel_id: z.number().int().optional().describe("Filter by top level"),
    asset_id: z.number().int().optional().describe("Filter by assigned asset"),
    search_phonenumbers: z.string().max(50).optional().describe("Search by phone number"),
    includeactive: z.boolean().optional().describe("Include active users"),
    includeinactive: z.boolean().optional().describe("Include inactive users"),
    include_custom_fields: z.string().max(500).optional().describe("Comma-separated custom field IDs"),
    approvalsonly: z.boolean().optional().describe("Only users that can approve"),
    excludeagents: z.boolean().optional().describe("Exclude users linked to agents"),
    count: z.number().int().optional().describe("Number of results (when not paginating)"),
    includedetails: z.boolean().optional().describe("Include extra objects"),
    includeactivity: z.boolean().optional().describe("Include ticket activity"),
    includepopups: z.boolean().optional().describe("Include customer pop-ups"),
    advanced_search: z.array(z.object({
      filter_name: z.string().max(100),
      filter_type: z.number().int().min(0).max(10),
      filter_value: z.string().max(2000),
    })).max(50).optional().describe("Advanced search filters"),
  },
};
