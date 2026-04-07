/**
 * Halo ITSM MCP Server - MCP Resources (Read-Only Context)
 *
 * Provides contextual information to MCP clients without performing actions.
 */

import { HaloClient } from "../client/halo-client.js";
import { HaloConfig } from "../types/config.js";

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string>;
}

export function buildResources(client: HaloClient, config: HaloConfig): McpResource[] {
  return [
    {
      uri: "halo://config/status",
      name: "Server Status",
      description: "Connection status, authenticated state, and instance URL",
      mimeType: "application/json",
      handler: async () => {
        return JSON.stringify({
          instance: config.baseUrl,
          authenticated: client.isAuthenticated(),
          api_version: "2.220.93",
          scope: config.scope,
        }, null, 2);
      },
    },
    {
      uri: "halo://config/rate-limit",
      name: "Rate Limit Status",
      description: "Current API rate limit usage: used, remaining, window size",
      mimeType: "application/json",
      handler: async () => {
        return JSON.stringify(client.getRateLimitStatus(), null, 2);
      },
    },
    {
      uri: "halo://schema/statuses",
      name: "Status Values",
      description: "All available status values with their types",
      mimeType: "application/json",
      handler: async () => {
        try {
          const response = await client.list("/Status");
          return JSON.stringify(response.data, null, 2);
        } catch (err) {
          return JSON.stringify({ error: (err as Error).message });
        }
      },
    },
    {
      uri: "halo://schema/teams",
      name: "Teams",
      description: "All teams for quick reference",
      mimeType: "application/json",
      handler: async () => {
        try {
          const response = await client.list("/Team");
          return JSON.stringify(response.data, null, 2);
        } catch (err) {
          return JSON.stringify({ error: (err as Error).message });
        }
      },
    },
    {
      uri: "halo://schema/agents",
      name: "Agents",
      description: "Agent list for quick reference",
      mimeType: "application/json",
      handler: async () => {
        try {
          const response = await client.list("/Agent");
          return JSON.stringify(response.data, null, 2);
        } catch (err) {
          return JSON.stringify({ error: (err as Error).message });
        }
      },
    },
    {
      uri: "halo://schema/ticket-types",
      name: "Ticket Types",
      description: "Available ticket types",
      mimeType: "application/json",
      handler: async () => {
        try {
          const response = await client.list("/TicketType");
          return JSON.stringify(response.data, null, 2);
        } catch (err) {
          return JSON.stringify({ error: (err as Error).message });
        }
      },
    },
  ];
}
