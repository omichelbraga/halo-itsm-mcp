/**
 * SLA - Service Level Agreements
 * Endpoint: /SLA
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const slaConfig: ResourceConfig = {
  name: "sla",
  apiPath: "/SLA",
  description: "SLA (service level agreement)",
  readPermission: "Agent",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
