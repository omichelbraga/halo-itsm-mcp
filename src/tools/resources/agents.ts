/**
 * Agents - Agent accounts, preferences, permissions
 * Endpoint: /Agent
 */

import { z } from "zod";
import { ResourceConfig, ToolDefinition } from "../resource-factory.js";
import { HaloClient } from "../../client/halo-client.js";

export function createAgentsConfig(client: HaloClient): ResourceConfig {
  const meToolDef: ToolDefinition = {
    name: "halo_agents_me",
    description: "Get the agent associated with the current access token. Halo permission: Agent.",
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const response = await client.get("/Agent", "me");
        if (!response.ok) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: `Failed: HTTP ${response.status}` }) }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(response.data, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
          isError: true,
        };
      }
    },
  };

  return {
    name: "agents",
    apiPath: "/Agent",
    description: "agent",
    readPermission: "Agent",
    writePermission: "Agent (update preferences), Admin (create/delete)",
    listParams: {
      team: z.number().int().optional().describe("Filter by team ID"),
      section_id: z.number().int().optional().describe("Filter by team/section ID"),
      department_id: z.number().int().optional().describe("Filter by department ID"),
      client_id: z.number().int().optional().describe("Filter by client access"),
      role: z.string().optional().describe("Filter by role"),
      includeenabled: z.boolean().optional().describe("Include enabled agents"),
      includedisabled: z.boolean().optional().describe("Include disabled agents"),
      includeunassigned: z.boolean().optional().describe("Include unassigned agent"),
      includedetails: z.boolean().optional().describe("Include extra objects (teams, roles)"),
    },
    customTools: [meToolDef],
  };
}
