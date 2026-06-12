/**
 * ADVNT HaloITSM MCP — Server entry point
 * ADVNT-585 / L3b CLOUD
 *
 * Multi-tenant, governed MCP server.
 * Auth via ORION JWT (resolved by authMiddleware).
 * Tool gating via policy-enforcer (plan tier + Phase 1 read-only).
 *
 * Transport: StreamableHTTP only.
 * Client (Claude Desktop) uses npx-client.ts as a stdio↔HTTP bridge.
 */

import express from 'express'
import { createMcpRouter } from './server'
import { healthRouter } from './health/router'

const app = express()
const PORT = parseInt(process.env.MCP_PORT ?? '3000', 10)

app.use(express.json())
app.use('/health', healthRouter)
app.use('/mcp', createMcpRouter())

// OAuth discovery endpoint — required for MCP spec compliance
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  const base = process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
  })
})

app.listen(PORT, () => {
  console.log(`[ADVNT HaloITSM MCP] ADVNT-585 running on port ${PORT}`)
  console.log(`[ADVNT HaloITSM MCP] Public URL: ${process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`}`)
})
