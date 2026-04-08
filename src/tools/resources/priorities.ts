/**
 * Priorities - Ticket priority levels
 * Endpoint: /Priority
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const prioritiesConfig: ResourceConfig = {
  name: "priorities",
  apiPath: "/Priority",
  description: "priority",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
