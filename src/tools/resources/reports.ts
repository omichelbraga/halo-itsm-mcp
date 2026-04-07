/**
 * Reports
 * Endpoint: /Report
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const reportsConfig: ResourceConfig = {
  name: "reports",
  apiPath: "/Report",
  description: "report",
  readPermission: "Agent, Report Read",
  writePermission: "Agent, Report Modify",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    site_id: z.number().int().optional().describe("Filter by site ID"),
    user_id: z.number().int().optional().describe("Filter by user ID"),
    report_group_id: z.number().int().optional().describe("Filter by report group ID"),
    chartsonly: z.boolean().optional().describe("Only return chart reports"),
    count: z.number().int().optional().describe("Number of results"),
  },
  getParams: {
    loadreport: z.boolean().optional().describe("Set to true to include computed report data in the response"),
  },
};
