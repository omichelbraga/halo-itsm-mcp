/**
 * Canned Text - Pre-written response templates
 * Endpoint: /CannedText
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const cannedTextConfig: ResourceConfig = {
  name: "cannedtext",
  apiPath: "/CannedText",
  description: "canned text (response template)",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
