/**
 * Fields - Custom field definitions
 * Endpoint: /Field
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const fieldsConfig: ResourceConfig = {
  name: "fields",
  apiPath: "/Field",
  description: "custom field",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    kind: z.string().max(100).optional().describe("Filter by field kind"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
