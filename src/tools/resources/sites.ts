/**
 * Sites - Customer site locations
 * Endpoint: /Site
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const sitesConfig: ResourceConfig = {
  name: "sites",
  apiPath: "/Site",
  description: "site",
  readPermission: "Agent, Customers Read",
  writePermission: "Agent, Customers Modify (Admin for delete)",
  listParams: {
    client_id: z.number().int().optional().describe("Filter by client ID"),
    top_level_id: z.number().int().optional().describe("Filter by top-level ID"),
    includeinactive: z.boolean().optional().describe("Include inactive sites"),
    includeactive: z.boolean().optional().describe("Include active sites"),
    include_custom_fields: z.string().max(500).optional().describe("Comma-separated custom field IDs"),
    count: z.number().int().optional().describe("Number of results"),
  },
  getParams: {
    includedetails: z.boolean().optional().describe("Include activity details"),
  },
};
