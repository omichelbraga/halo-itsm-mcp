/**
 * Workflows - Workflow definitions
 * Endpoint: /Workflow
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const workflowsConfig: ResourceConfig = {
  name: "workflows",
  apiPath: "/Workflow",
  description: "workflow",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
