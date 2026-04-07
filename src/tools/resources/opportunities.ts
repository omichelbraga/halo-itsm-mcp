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
    team: z.array(z.number().int()).max(100).optional().describe("Filter by team IDs"),
    agent: z.array(z.number().int()).max(100).optional().describe("Filter by agent IDs"),
    status: z.array(z.number().int()).max(100).optional().describe("Filter by status IDs"),
    priority: z.array(z.number().int()).max(100).optional().describe("Filter by priority IDs"),
    category_1: z.array(z.number().int()).max(100).optional().describe("Filter by category 1 IDs"),
    category_2: z.array(z.number().int()).max(100).optional().describe("Filter by category 2 IDs"),
    category_3: z.array(z.number().int()).max(100).optional().describe("Filter by category 3 IDs"),
    category_4: z.array(z.number().int()).max(100).optional().describe("Filter by category 4 IDs"),
    sla: z.array(z.number().int()).max(100).optional().describe("Filter by SLA IDs"),
    open_only: z.boolean().optional().describe("Only open opportunities"),
    closed_only: z.boolean().optional().describe("Only closed opportunities"),
    datesearch: z.string().max(100).optional().describe("Date field to search"),
    startdate: z.string().max(50).optional().describe("Start date for date range"),
    enddate: z.string().max(50).optional().describe("End date for date range"),
    search_summary: z.string().max(1000).optional().describe("Search by summary"),
    search_details: z.string().max(2000).optional().describe("Search by details"),
    advanced_search: z.array(z.object({
      filter_name: z.string().max(100),
      filter_type: z.number().int().min(0).max(10),
      filter_value: z.string().max(2000),
    })).max(50).optional().describe("Advanced search filters"),
  },
  deleteParams: {
    reason: z.string().max(2000).optional().describe("Reason for deletion"),
  },
};
