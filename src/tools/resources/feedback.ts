/**
 * Feedback - Customer satisfaction/feedback
 * Endpoint: /Feedback
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const feedbackConfig: ResourceConfig = {
  name: "feedback",
  apiPath: "/Feedback",
  description: "feedback (customer satisfaction)",
  readPermission: "Agent",
  writePermission: "Agent",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    client_id: z.number().int().optional().describe("Filter by client ID"),
    agent_id: z.number().int().optional().describe("Filter by agent ID"),
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
