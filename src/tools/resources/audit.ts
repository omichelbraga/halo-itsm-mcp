/**
 * Audit - Audit trail / change log
 * Endpoint: /Audit
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const auditConfig: ResourceConfig = {
  name: "audit",
  apiPath: "/Audit",
  description: "audit log entry",
  readPermission: "Admin",
  writePermission: "Admin",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    agent_id: z.number().int().optional().describe("Filter by agent ID"),
    start_date: z.string().max(50).optional().describe("Start date filter (ISO date)"),
    end_date: z.string().max(50).optional().describe("End date filter (ISO date)"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
