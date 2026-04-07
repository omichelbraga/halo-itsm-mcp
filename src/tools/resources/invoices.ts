/**
 * Invoices
 * Endpoint: /Invoice
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const invoicesConfig: ResourceConfig = {
  name: "invoices",
  apiPath: "/Invoice",
  description: "invoice",
  readPermission: "Agent, Sales Read",
  writePermission: "Agent, Sales Modify",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    site_id: z.number().int().optional().describe("Filter by site ID"),
    user_id: z.number().int().optional().describe("Filter by user ID"),
    count: z.number().int().optional().describe("Number of results"),
  },
};
