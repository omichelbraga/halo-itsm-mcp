/**
 * Teams
 * Endpoint: /Team
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const teamsConfig: ResourceConfig = {
  name: "teams",
  apiPath: "/Team",
  description: "team",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    type: z.string().max(50).optional().describe("Filter by type: 'reqs' (tickets), 'opps' (opportunities), 'prjs' (projects)"),
    count: z.number().int().optional().describe("Number of results"),
    domain: z.string().max(100).optional().describe("Filter by domain"),
    department_id: z.number().int().optional().describe("Filter by department"),
    member_only: z.boolean().optional().describe("Only teams user is a member of"),
    includeagents: z.boolean().optional().describe("Include agent list for each team"),
  },
  getParams: {
    includeagents: z.boolean().optional().describe("Include agents in response"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
