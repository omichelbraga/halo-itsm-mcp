/**
 * Halo ITSM MCP Server - Tool Registry
 *
 * Registers all resource domains and their CRUD tools.
 */

import { HaloClient } from "../client/halo-client.js";
import { createResourceTools, ToolDefinition } from "./resource-factory.js";

// Original resource configs
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

// Must-Have additions
import { categoriesConfig } from "./resources/categories.js";
import { slaConfig } from "./resources/sla.js";
import { prioritiesConfig } from "./resources/priorities.js";
import { workflowsConfig } from "./resources/workflows.js";
import { assetTypesConfig } from "./resources/asset-types.js";
import { assetGroupsConfig } from "./resources/asset-groups.js";
import { softwareLicencesConfig } from "./resources/software-licences.js";
import { ticketRulesConfig } from "./resources/ticket-rules.js";
import { organisationsConfig } from "./resources/organisations.js";
import { topLevelConfig } from "./resources/top-level.js";

// Should-Have additions
import { timesheetsConfig } from "./resources/timesheets.js";
import { holidaysConfig } from "./resources/holidays.js";
import { workdaysConfig } from "./resources/workdays.js";
import { fieldsConfig } from "./resources/fields.js";
import { cannedTextConfig } from "./resources/canned-text.js";
import { tagsConfig } from "./resources/tags.js";
import { feedbackConfig } from "./resources/feedback.js";
import { auditConfig } from "./resources/audit.js";
import { servicesConfig } from "./resources/services.js";
import { serviceStatusConfig } from "./resources/service-status.js";
import { purchaseOrdersConfig } from "./resources/purchase-orders.js";
import { downtimeConfig } from "./resources/downtime.js";

import { logger } from "../utils/logger.js";

/**
 * Build all tool definitions for all resources.
 */
export function buildAllTools(client: HaloClient): Map<string, ToolDefinition> {
  const toolMap = new Map<string, ToolDefinition>();

  // Agents needs the client reference for the custom /me tool
  const agentsConfig = createAgentsConfig(client);

  const allConfigs = [
    // Core ITSM
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

    // Must-Have additions
    categoriesConfig,
    slaConfig,
    prioritiesConfig,
    workflowsConfig,
    assetTypesConfig,
    assetGroupsConfig,
    softwareLicencesConfig,
    ticketRulesConfig,
    organisationsConfig,
    topLevelConfig,

    // Should-Have additions
    timesheetsConfig,
    holidaysConfig,
    workdaysConfig,
    fieldsConfig,
    cannedTextConfig,
    tagsConfig,
    feedbackConfig,
    auditConfig,
    servicesConfig,
    serviceStatusConfig,
    purchaseOrdersConfig,
    downtimeConfig,
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
