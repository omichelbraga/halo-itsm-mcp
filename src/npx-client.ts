#!/usr/bin/env node
/**
 * ADVNT HaloITSM MCP — npx client entry point
 *
 * This runs on the CLIENT machine (Claude Desktop host).
 * It is a lightweight stdio↔HTTP bridge:
 *   Claude Desktop (stdio) ↔ this process ↔ ADVNT MCP server (HTTP)
 *
 * No Halo credentials on the client — auth is the ORION_TOKEN JWT.
 * The actual HaloITSM calls happen server-side at ADVNT.
 *
 * Usage (via Claude Desktop config):
 *   command: npx
 *   args: ["-y", "advnt-haloitsm-mcp"]
 *   env:
 *     ORION_TOKEN: <jwt from ORION connect hub>
 *     MCP_SERVER_URL: https://halo-mcp.advnt.ai/mcp
 *     ORION_PROJECT_ID: <optional, partner only>
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const TOKEN = process.env.ORION_TOKEN
const SERVER_URL = process.env.MCP_SERVER_URL ?? 'https://halo-mcp.advnt.ai/mcp'
const PROJECT_ID = process.env.ORION_PROJECT_ID

if (!TOKEN) {
  console.error('[advnt-haloitsm-mcp] ORION_TOKEN is required. Get it from ORION → Connect → HaloITSM MCP.')
  process.exit(1)
}

async function main() {
  // Connect to ADVNT MCP server via HTTP
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    'x-advnt-caller': 'claude_desktop',
  }
  if (PROJECT_ID) headers['x-project-id'] = PROJECT_ID

  const httpTransport = new StreamableHTTPClientTransport(
    new URL(SERVER_URL),
    { requestInit: { headers } }
  )

  const remoteClient = new Client({ name: 'advnt-haloitsm-mcp-proxy', version: '0.1.0' })
  await remoteClient.connect(httpTransport)

  // Expose as local stdio MCP server to Claude Desktop
  const localServer = new Server(
    { name: 'orion-halo', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  // Proxy: list tools from remote
  localServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return remoteClient.listTools()
  })

  // Proxy: call tool on remote
  localServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    return remoteClient.callTool({
      name: request.params.name,
      arguments: request.params.arguments,
    })
  })

  const stdioTransport = new StdioServerTransport()
  await localServer.connect(stdioTransport)
}

main().catch((err) => {
  console.error('[advnt-haloitsm-mcp]', err)
  process.exit(1)
})
