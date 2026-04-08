/**
 * Organisations - Organizational structure
 * Endpoint: /Organisation
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const organisationsConfig: ResourceConfig = {
  name: "organisations",
  apiPath: "/Organisation",
  description: "organisation",
  readPermission: "Agent, Customers Read",
  writePermission: "Agent, Customers Modify",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
