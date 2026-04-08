/**
 * Asset Groups - Asset grouping/organization
 * Endpoint: /AssetGroup
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const assetGroupsConfig: ResourceConfig = {
  name: "assetgroups",
  apiPath: "/AssetGroup",
  description: "asset group",
  readPermission: "Agent, Assets Read",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
