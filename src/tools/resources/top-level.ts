/**
 * Top Level - Top-level customer/organisation hierarchy
 * Endpoint: /TopLevel
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const topLevelConfig: ResourceConfig = {
  name: "toplevel",
  apiPath: "/TopLevel",
  description: "top-level group",
  readPermission: "Agent, Customers Read",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
