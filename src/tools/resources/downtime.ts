/**
 * Downtime - Planned downtime / maintenance windows
 * Endpoint: /Downtime
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const downtimeConfig: ResourceConfig = {
  name: "downtime",
  apiPath: "/Downtime",
  description: "downtime (maintenance window)",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    service_id: z.number().int().optional().describe("Filter by service ID"),
    start_date: z.string().max(50).optional().describe("Start date filter (ISO date)"),
    end_date: z.string().max(50).optional().describe("End date filter (ISO date)"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
