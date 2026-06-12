/**
 * HaloITSM ConnectorAdapter.
 *
 * Thin implementation of @advnt/mcp-orion's ConnectorAdapter:
 *   listTools()       — flat dispatch table built from src/tools/*
 *   callTool()        — name-keyed lookup + execute(input, ctx, env)
 *   testConnection()  — exchanges OAuth client_credentials against Halo's
 *                       /auth/token to confirm credential + instance are live
 *
 * No policy / audit / credential resolution lives here — that's all the
 * shared package. The worker entry point wires them in.
 */
import {
  getOauthClientCredentialsToken,
  type Connection,
  type ConnectorAdapter,
  type CallContext,
  type TestResult,
  type ToolDefinition,
} from '@advnt/mcp-orion'
import type { Env } from './types/env.js'
import { getAllTools, type AdvntTool } from './tools/index.js'

const CONNECTOR_SLUG = 'haloitsm'

export class HaloAdapter implements ConnectorAdapter {
  readonly connectorSlug = CONNECTOR_SLUG

  private readonly tools: AdvntTool[]
  private readonly toolsByName: Map<string, AdvntTool>
  private readonly env: Env

  constructor(env: Env) {
    this.env = env
    this.tools = getAllTools()
    this.toolsByName = new Map(this.tools.map((t) => [t.name, t]))
  }

  listTools(): ToolDefinition[] {
    return this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      alwaysAvailable: t.alwaysAvailable,
    }))
  }

  /** True when the tool was registered with alwaysAvailable: true. */
  isAlwaysAvailable(toolName: string): boolean {
    return this.toolsByName.get(toolName)?.alwaysAvailable === true
  }

  async callTool(
    name: string,
    input: Record<string, unknown>,
    ctx: CallContext,
  ): Promise<unknown> {
    const tool = this.toolsByName.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    return tool.execute(input, ctx.tenant, this.env)
  }

  async testConnection(
    connection: Connection,
    getCredential: () => Promise<string>,
  ): Promise<TestResult> {
    try {
      const token = await getOauthClientCredentialsToken(connection, getCredential, {
        tokenUrlTemplate: '{instance_url}/auth/token',
        tenantField: 'tenant',
      })
      return { ok: true, detail: `Token acquired (length ${token.length})` }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err)
      return { ok: false, detail }
    }
  }
}
