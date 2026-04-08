/**
 * Purchase Orders - IT procurement
 * Endpoint: /PurchaseOrder
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const purchaseOrdersConfig: ResourceConfig = {
  name: "purchaseorders",
  apiPath: "/PurchaseOrder",
  description: "purchase order",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    supplier_id: z.number().int().optional().describe("Filter by supplier ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    status_id: z.number().int().optional().describe("Filter by status ID"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
