/**
 * Holidays - Holiday schedules (affects SLA calculations)
 * Endpoint: /Holiday
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const holidaysConfig: ResourceConfig = {
  name: "holidays",
  apiPath: "/Holiday",
  description: "holiday",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
