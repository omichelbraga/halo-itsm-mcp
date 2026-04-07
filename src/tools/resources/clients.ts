/**
 * Clients - Customer records
 * Endpoint: /Client
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const clientsConfig: ResourceConfig = {
  name: "clients",
  apiPath: "/Client",
  description: "client (customer)",
  readPermission: "Agent, Customers Read",
  writePermission: "Agent, Customers Modify (Admin for delete)",
  listParams: {
    toplevel_id: z.number().int().optional().describe("Filter by top-level customer"),
    includeinactive: z.boolean().optional().describe("Include inactive customers"),
    includeactive: z.boolean().optional().describe("Include active customers"),
    include_custom_fields: z.string().optional().describe("Comma-separated custom field IDs"),
    count: z.number().int().optional().describe("Number of results (when not paginating)"),
    include_website: z.boolean().optional().describe("Include website field"),
    includedetails: z.boolean().optional().describe("Include extra objects"),
    includeactivity: z.boolean().optional().describe("Include ticket activity"),
  },
};
