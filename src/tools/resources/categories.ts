/**
 * Categories - Ticket categorization (4 levels)
 * Endpoint: /Category
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const categoriesConfig: ResourceConfig = {
  name: "categories",
  apiPath: "/Category",
  description: "category",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    type_id: z.number().int().optional().describe("Filter by category level (1-4)"),
    tickettype_id: z.number().int().optional().describe("Filter by ticket type ID"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
