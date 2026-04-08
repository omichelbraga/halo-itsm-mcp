/**
 * Timesheets - Time tracking entries
 * Endpoint: /Timesheet
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const timesheetsConfig: ResourceConfig = {
  name: "timesheets",
  apiPath: "/Timesheet",
  description: "timesheet entry",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    agent_id: z.number().int().optional().describe("Filter by agent ID"),
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    start_date: z.string().max(50).optional().describe("Start date filter (ISO date)"),
    end_date: z.string().max(50).optional().describe("End date filter (ISO date)"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
  disableOps: ["delete"],
};
