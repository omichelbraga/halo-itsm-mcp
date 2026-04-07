/**
 * Status - Ticket/opportunity/project statuses
 * Endpoint: /Status
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const statusConfig: ResourceConfig = {
  name: "status",
  apiPath: "/Status",
  description: "status",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    type: z.string().max(50).optional().describe("Filter by type: 'ticket', 'opportunity', or 'project'"),
    count: z.number().int().optional().describe("Number of results"),
    domain: z.string().max(100).optional().describe("Filter by domain"),
    excludepending: z.boolean().optional().describe("Exclude pending statuses"),
    excludeclosed: z.boolean().optional().describe("Exclude closed statuses"),
  },
};
