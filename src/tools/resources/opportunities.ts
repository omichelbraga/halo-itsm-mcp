/**
 * Opportunities - Sales opportunities
 * Endpoint: /Opportunities
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const opportunitiesConfig: ResourceConfig = {
  name: "opportunities",
  apiPath: "/Opportunities",
  description: "opportunity",
  readPermission: "Agent, Sales Read",
  writePermission: "Agent, Sales Modify",
  listParams: {
    agent_id: z.number().int().optional().describe("Filter by agent"),
    status_id: z.number().int().optional().describe("Filter by status"),
    client_id: z.number().int().optional().describe("Filter by client"),
    team: z.array(z.number().int()).optional().describe("Filter by team IDs"),
    agent: z.array(z.number().int()).optional().describe("Filter by agent IDs"),
    status: z.array(z.number().int()).optional().describe("Filter by status IDs"),
    priority: z.array(z.number().int()).optional().describe("Filter by priority IDs"),
    category_1: z.array(z.number().int()).optional().describe("Filter by category 1 IDs"),
    category_2: z.array(z.number().int()).optional().describe("Filter by category 2 IDs"),
    category_3: z.array(z.number().int()).optional().describe("Filter by category 3 IDs"),
    category_4: z.array(z.number().int()).optional().describe("Filter by category 4 IDs"),
    sla: z.array(z.number().int()).optional().describe("Filter by SLA IDs"),
    open_only: z.boolean().optional().describe("Only open opportunities"),
    closed_only: z.boolean().optional().describe("Only closed opportunities"),
    datesearch: z.string().optional().describe("Date field to search"),
    startdate: z.string().optional().describe("Start date for date range"),
    enddate: z.string().optional().describe("End date for date range"),
    search_summary: z.string().optional().describe("Search by summary"),
    search_details: z.string().optional().describe("Search by details"),
    advanced_search: z.array(z.object({
      filter_name: z.string(),
      filter_type: z.number().int().min(0).max(10),
      filter_value: z.string(),
    })).optional().describe("Advanced search filters"),
  },
  deleteParams: {
    reason: z.string().optional().describe("Reason for deletion"),
  },
};
