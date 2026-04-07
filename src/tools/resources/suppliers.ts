/**
 * Suppliers
 * Endpoint: /Supplier
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const suppliersConfig: ResourceConfig = {
  name: "suppliers",
  apiPath: "/Supplier",
  description: "supplier",
  readPermission: "Agent, Supplier Read",
  writePermission: "Agent, Supplier Modify",
  listParams: {
    top_level_id: z.number().int().optional().describe("Filter by top-level ID"),
    includeinactive: z.boolean().optional().describe("Include inactive suppliers"),
    includeactive: z.boolean().optional().describe("Include active suppliers"),
    count: z.number().int().optional().describe("Number of results"),
  },
};
