/**
 * Services - Service catalog items
 * Endpoint: /Service
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const servicesConfig: ResourceConfig = {
  name: "services",
  apiPath: "/Service",
  description: "service (catalog item)",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    client_id: z.number().int().optional().describe("Filter by client ID"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
