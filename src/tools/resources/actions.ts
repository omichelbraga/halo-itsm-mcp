/**
 * Actions - Work log entries, notes, communications on tickets
 * Endpoint: /Actions
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const actionsConfig: ResourceConfig = {
  name: "actions",
  apiPath: "/Actions",
  description: "action (ticket note/communication)",
  readPermission: "User",
  writePermission: "User (create), Agent (delete)",
  listParams: {
    ticket_id: z.number().int().optional().describe("Get actions for a specific ticket (recommended)"),
    count: z.number().int().optional().describe("Number of actions to return"),
    excludesys: z.boolean().optional().describe("Exclude system-generated actions"),
    conversationonly: z.boolean().optional().describe("Only agent-to-end-user conversation actions"),
    agentonly: z.boolean().optional().describe("Only actions done by agents"),
    supplieronly: z.boolean().optional().describe("Only actions related to suppliers"),
    excludeprivate: z.boolean().optional().describe("Only public actions"),
    includehtmlnote: z.boolean().optional().describe("Include action note HTML"),
    includehtmlemail: z.boolean().optional().describe("Include action email HTML"),
    includeattachments: z.boolean().optional().describe("Include attachment details"),
    importantonly: z.boolean().optional().describe("Only important actions"),
    slaonly: z.boolean().optional().describe("Only SLA hold/release actions"),
    ischildnotes: z.boolean().optional().describe("Only actions from child tickets"),
  },
};
