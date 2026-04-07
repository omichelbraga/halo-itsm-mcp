/**
 * Halo ITSM MCP Server - Tool Registry
 *
 * Registers all 21 resource domains and their CRUD tools.
 * Total: 85 tools (21 x 4 CRUD + 1 custom agents_me).
 */

import { HaloClient } from "../client/halo-client.js";
import { createResourceTools, ToolDefinition } from "./resource-factory.js";

// Resource configs
import { ticketsConfig } from "./resources/tickets.js";
import { actionsConfig } from "./resources/actions.js";
import { createAgentsConfig } from "./resources/agents.js";
import { assetsConfig } from "./resources/assets.js";
import { clientsConfig } from "./resources/clients.js";
import { usersConfig } from "./resources/users.js";
import { sitesConfig } from "./resources/sites.js";
import { contractsConfig } from "./resources/contracts.js";
import { attachmentsConfig } from "./resources/attachments.js";
import { appointmentsConfig } from "./resources/appointments.js";
import { invoicesConfig } from "./resources/invoices.js";
import { itemsConfig } from "./resources/items.js";
import { knowledgeBaseConfig } from "./resources/knowledge-base.js";
import { opportunitiesConfig } from "./resources/opportunities.js";
import { projectsConfig } from "./resources/projects.js";
import { quotesConfig } from "./resources/quotes.js";
import { reportsConfig } from "./resources/reports.js";
import { statusConfig } from "./resources/status.js";
import { suppliersConfig } from "./resources/suppliers.js";
import { teamsConfig } from "./resources/teams.js";
import { ticketTypesConfig } from "./resources/ticket-types.js";

import { logger } from "../utils/logger.js";

/**
 * Build all tool definitions for all resources.
 */
export function buildAllTools(client: HaloClient): Map<string, ToolDefinition> {
  const toolMap = new Map<string, ToolDefinition>();

  // Agents needs the client reference for the custom /me tool
  const agentsConfig = createAgentsConfig(client);

  const allConfigs = [
    ticketsConfig,
    actionsConfig,
    agentsConfig,
    assetsConfig,
    clientsConfig,
    usersConfig,
    sitesConfig,
    contractsConfig,
    attachmentsConfig,
    appointmentsConfig,
    invoicesConfig,
    itemsConfig,
    knowledgeBaseConfig,
    opportunitiesConfig,
    projectsConfig,
    quotesConfig,
    reportsConfig,
    statusConfig,
    suppliersConfig,
    teamsConfig,
    ticketTypesConfig,
  ];

  for (const config of allConfigs) {
    const tools = createResourceTools(config, client);
    for (const tool of tools) {
      if (toolMap.has(tool.name)) {
        logger.warn(`Duplicate tool name: ${tool.name}. Overwriting.`);
      }
      toolMap.set(tool.name, tool);
    }
  }

  logger.info(`Registered ${toolMap.size} tools across ${allConfigs.length} resource domains`);
  return toolMap;
}
