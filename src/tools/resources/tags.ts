/**
 * Tags - Ticket tagging
 * Endpoint: /Tags
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const tagsConfig: ResourceConfig = {
  name: "tags",
  apiPath: "/Tags",
  description: "tag",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
