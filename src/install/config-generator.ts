/**
 * ORION MCP Config Generator
 *
 * Called by ORION's Connect hub to generate client-ready
 * install instructions. Returns the exact config block
 * the client pastes into Claude Desktop.
 *
 * Customer:  one block, no project selection needed
 * Partner:   one block per project, or a single block with
 *            instructions on switching project context
 */

export interface McpInstallConfig {
  tenantType: 'customer' | 'partner' | 'admin'
  claudeDesktopConfig: ClaudeDesktopConfig
  installInstructions: InstallStep[]
  projects?: ProjectConfig[]  // partner only
}

export interface ClaudeDesktopConfig {
  mcpServers: {
    'orion-halo': {
      command: string
      args: string[]
      env: Record<string, string>
    }
  }
}

export interface ProjectConfig {
  projectId: string
  projectName: string
  connectionLabel: string | null
  claudeDesktopConfig: ClaudeDesktopConfig
}

export interface InstallStep {
  step: number
  title: string
  description: string
  code?: string
}

const MCP_PUBLIC_URL = process.env.MCP_PUBLIC_URL ?? 'https://halo-mcp.advnt.ai'

export function generateInstallConfig(
  tenantType: 'customer' | 'partner' | 'admin',
  orionJwt: string,
  projects?: Array<{ projectId: string; projectName: string; connectionLabel: string | null }>
): McpInstallConfig {
  if (tenantType === 'customer') {
    const config = buildClaudeConfig(orionJwt)
    return {
      tenantType,
      claudeDesktopConfig: config,
      installInstructions: buildInstallSteps(config, 'customer'),
    }
  }

  // Partner: one config per project
  const projectConfigs: ProjectConfig[] = (projects ?? []).map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    connectionLabel: p.connectionLabel,
    claudeDesktopConfig: buildClaudeConfig(orionJwt, p.projectId),
  }))

  // Default config uses first project or prompts for project_id
  const defaultConfig = buildClaudeConfig(orionJwt)

  return {
    tenantType,
    claudeDesktopConfig: defaultConfig,
    installInstructions: buildInstallSteps(defaultConfig, 'partner', projects),
    projects: projectConfigs,
  }
}

function buildClaudeConfig(token: string, projectId?: string): ClaudeDesktopConfig {
  const env: Record<string, string> = {
    ORION_TOKEN: token,
    MCP_SERVER_URL: `${MCP_PUBLIC_URL}/mcp`,
  }
  if (projectId) {
    env['ORION_PROJECT_ID'] = projectId
  }

  return {
    mcpServers: {
      'orion-halo': {
        command: 'npx',
        args: ['-y', 'advnt-haloitsm-mcp'],
        env,
      },
    },
  }
}

function buildInstallSteps(
  config: ClaudeDesktopConfig,
  tenantType: 'customer' | 'partner',
  projects?: Array<{ projectId: string; projectName: string; connectionLabel: string | null }>
): InstallStep[] {
  const configJson = JSON.stringify(config, null, 2)

  const steps: InstallStep[] = [
    {
      step: 1,
      title: 'Open Claude Desktop settings',
      description: 'Open Claude Desktop → Settings → Developer → Edit Config',
    },
    {
      step: 2,
      title: 'Paste your MCP configuration',
      description: 'Add the following block inside the "mcpServers" object in your claude_desktop_config.json:',
      code: configJson,
    },
    {
      step: 3,
      title: 'Restart Claude Desktop',
      description: 'Quit and reopen Claude Desktop. You should see "orion-halo" appear in your MCP tools list.',
    },
    {
      step: 4,
      title: 'Test the connection',
      description: 'In Claude, ask: "List my open HaloITSM tickets" — Claude will use your connected instance.',
    },
  ]

  if (tenantType === 'partner' && projects && projects.length > 1) {
    steps.push({
      step: 5,
      title: 'Switching between client projects',
      description: `You have ${projects.length} client projects connected. To work with a specific client, include the project name in your prompt (e.g. "For the Acme project, show me open P1 tickets") or select the active project in ORION before starting your Claude session.`,
    })
  }

  return steps
}
