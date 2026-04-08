/**
 * Workdays - Working day/hours definitions (affects SLA calculations)
 * Endpoint: /Workday
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const workdaysConfig: ResourceConfig = {
  name: "workdays",
  apiPath: "/Workday",
  description: "workday schedule",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
