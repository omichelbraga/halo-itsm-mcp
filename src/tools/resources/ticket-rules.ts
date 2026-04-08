/**
 * Ticket Rules - Auto-assignment and routing rules
 * Endpoint: /TicketRules
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const ticketRulesConfig: ResourceConfig = {
  name: "ticketrules",
  apiPath: "/TicketRules",
  description: "ticket rule (auto-assignment)",
  readPermission: "Admin",
  writePermission: "Admin",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
