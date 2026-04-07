/**
 * Attachments - File attachments (Base64 encoded)
 * Endpoint: /Attachment
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const attachmentsConfig: ResourceConfig = {
  name: "attachments",
  apiPath: "/Attachment",
  description: "attachment",
  readPermission: "User",
  writePermission: "User",
  listParams: {
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    action_id: z.number().int().optional().describe("Filter by action ID (requires ticket_id)"),
    type: z.string().max(200).optional().describe("Filter by attachment type"),
    unique_id: z.string().max(200).optional().describe("Filter by unique attachment ID"),
    includedetails: z.boolean().optional().describe("Include extra objects"),
  },
};
