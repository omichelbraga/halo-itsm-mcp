/**
 * Meta tools — always-available regardless of plan tier or per-tenant policy.
 * Help partner users discover and switch project context.
 *
 * Uses the @advnt/mcp-orion Connection shape: instanceUrl / projectName /
 * displayName / instanceType / isDemo / demoExpiresAt.
 */
import type { AdvntTool } from './index.js'

export const metaTools: AdvntTool[] = [
  {
    name: 'halo_list_projects',
    description:
      'List all HaloITSM projects/connections available to you in ORION. Partners use this to see all connected client instances and switch context.',
    inputSchema: { type: 'object', properties: {} },
    execute: async (_input, ctx) => {
      if (ctx.tenantType === 'customer') {
        if (!ctx.activeConnection) {
          return {
            message:
              'No Halo connection configured. Go to ORION → Connect → HaloITSM MCP to set up.',
          }
        }
        return {
          tenant_type: 'customer',
          active: {
            project_id: ctx.activeConnection.projectId,
            project_name: ctx.activeConnection.projectName,
            instance_type: ctx.activeConnection.instanceType,
            environment_label: ctx.activeConnection.displayName,
            instance_url: ctx.activeConnection.instanceUrl,
          },
        }
      }

      const byProject: Record<
        string,
        {
          project_id: string | null
          project_name: string | null
          project_type: string | null
          instances: Array<{
            instance_type: string
            environment_label: string | null
            connection_id: string
            is_demo: boolean
            demo_expires_at: string | null
          }>
        }
      > = {}
      for (const c of ctx.allConnections) {
        const key = c.projectId ?? 'internal'
        if (!byProject[key]) {
          byProject[key] = {
            project_id: c.projectId,
            project_name: c.projectName,
            project_type: c.projectType,
            instances: [],
          }
        }
        byProject[key].instances.push({
          instance_type: c.instanceType,
          environment_label: c.displayName,
          connection_id: c.id,
          is_demo: c.isDemo,
          demo_expires_at: c.demoExpiresAt,
        })
      }

      return {
        tenant_type: ctx.tenantType,
        active: ctx.activeConnection
          ? {
              project_id: ctx.activeConnection.projectId,
              project_name: ctx.activeConnection.projectName,
              instance_type: ctx.activeConnection.instanceType,
              environment_label: ctx.activeConnection.displayName,
              instance_url: ctx.activeConnection.instanceUrl,
            }
          : null,
        available: Object.values(byProject),
        tip: ctx.activeConnection
          ? `Active: ${ctx.activeConnection.displayName ?? ctx.activeConnection.instanceType} — ${ctx.activeConnection.projectName ?? ctx.activeConnection.projectId ?? 'internal'}`
          : 'No instance selected. Pass ?project_id=<id>&instance_type=production (or qa/dev/demo).',
      }
    },
    alwaysAvailable: true,
  },
  {
    name: 'halo_switch_instance',
    description:
      'Switch the active HaloITSM instance. Use when working across multiple client projects or environments (production, QA, dev, demo). Pass project_id and instance_type.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project UUID from halo_list_projects' },
        instance_type: {
          type: 'string',
          enum: ['production', 'qa', 'dev', 'demo', 'internal'],
          description: 'Environment to switch to',
        },
      },
    },
    execute: async (input, ctx) => {
      const projectId = input.project_id as string | undefined
      const instanceType = input.instance_type as string | undefined
      const target = ctx.allConnections.find(
        (c) => c.projectId === projectId && c.instanceType === instanceType,
      )
      if (!target) {
        return {
          error: `No ${instanceType ?? 'unknown'} instance found for project ${projectId ?? 'unknown'}`,
          available: ctx.allConnections.map((c) => ({
            project_id: c.projectId,
            project_name: c.projectName,
            instance_type: c.instanceType,
          })),
        }
      }
      return {
        switched: true,
        message: `Now using ${target.displayName ?? target.instanceType} — ${target.projectName ?? target.projectId ?? 'internal'}. Note: this applies to this response only. To persist, pass ?project_id=${target.projectId}&instance_type=${target.instanceType} in your MCP requests.`,
        connection: {
          project_id: target.projectId,
          project_name: target.projectName,
          instance_type: target.instanceType,
          environment_label: target.displayName,
        },
      }
    },
    alwaysAvailable: true,
  },
]
