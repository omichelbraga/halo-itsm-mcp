/**
 * Service Status - Service status page entries
 * Endpoint: /ServiceStatus
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const serviceStatusConfig: ResourceConfig = {
  name: "servicestatus",
  apiPath: "/ServiceStatus",
  description: "service status",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    service_id: z.number().int().optional().describe("Filter by service ID"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
