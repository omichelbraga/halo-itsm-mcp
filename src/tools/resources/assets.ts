/**
 * Assets - CMDB / Asset management
 * Endpoint: /Asset
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const assetsConfig: ResourceConfig = {
  name: "assets",
  apiPath: "/Asset",
  description: "asset",
  readPermission: "User, Assets Read",
  writePermission: "Agent, Assets Modify",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by assets on a ticket"),
    client_id: z.number().int().optional().describe("Filter by client"),
    site_id: z.number().int().optional().describe("Filter by site"),
    username: z.string().max(200).optional().describe("Filter by username"),
    assetgroup_id: z.number().int().optional().describe("Filter by asset group"),
    assettype_id: z.number().int().optional().describe("Filter by asset type"),
    linkedto_id: z.number().int().optional().describe("Filter by linked asset"),
    contract_id: z.number().int().optional().describe("Filter by contract"),
    includeinactive: z.boolean().optional().describe("Include inactive assets"),
    includeactive: z.boolean().optional().describe("Include active assets"),
    includechildren: z.boolean().optional().describe("Include child assets"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
