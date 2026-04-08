/**
 * Asset Types - CMDB asset type definitions
 * Endpoint: /AssetType
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const assetTypesConfig: ResourceConfig = {
  name: "assettypes",
  apiPath: "/AssetType",
  description: "asset type",
  readPermission: "Agent, Assets Read",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
