/**
 * Items - Products and services
 * Endpoint: /Item
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const itemsConfig: ResourceConfig = {
  name: "items",
  apiPath: "/Item",
  description: "item (product/service)",
  readPermission: "Agent, Item Read",
  writePermission: "Agent, Item Modify",
  listParams: {
    count: z.number().int().optional().describe("Number of results"),
    include_custom_fields: z.string().max(500).optional().describe("Comma-separated custom field IDs"),
  },
};
