# Halo ITSM MCP Server

A Model Context Protocol (MCP) server that exposes the full Halo ITSM REST API to AI assistants. Provides 172 tools across 43 resource domains, enabling AI-driven IT service management through any MCP-compatible client.

Built by the City of San Marcos, CA - IT Division.

## Features

- **172 tools** across 43 Halo ITSM resource domains (tickets, agents, assets, categories, SLAs, priorities, workflows, services, and more)
- **6 read-only MCP resources** for configuration context (statuses, teams, agents, ticket types, rate limit status)
- **Three transport modes**: stdio, HTTP (Streamable HTTP + SSE), HTTP with OAuth proxy
- **Two authentication modes**: environment-based Client Credentials, or OAuth proxy (credentials passed at connection time)
- **PKCE auto-injection** for OAuth clients that don't natively support it
- **Rate limiting**: 700 requests per 5-minute sliding window with 80% usage warnings
- **Circuit breaker**: pauses requests after 5 consecutive failures (30-second cooldown)
- **Retry logic**: exponential backoff with jitter for 429 and 5xx responses
- **Docker-ready**: multi-stage build, non-root user, health check endpoint, read-only filesystem, resource limits
- **Reverse proxy compatible**: runs plain HTTP internally, TLS handled externally
- **Security hardened**: security headers on all responses, input size validation, fetch timeouts, error sanitization, secret redaction in logs

## Supported Resource Domains

| Domain | Tools | API Path |
|--------|-------|----------|
| Tickets | list, get, upsert, delete | /Tickets |
| Actions | list, get, upsert, delete | /Actions |
| Agents | list, get, upsert, delete, **me** | /Agent |
| Assets | list, get, upsert, delete | /Asset |
| Asset Groups | list, get, upsert, delete | /AssetGroup |
| Asset Types | list, get, upsert, delete | /AssetType |
| Attachments | list, get, upsert, delete | /Attachment |
| Appointments | list, get, upsert, delete | /Appointment |
| Audit | list, get, upsert, delete | /Audit |
| Canned Text | list, get, upsert, delete | /CannedText |
| Categories | list, get, upsert, delete | /Category |
| Clients | list, get, upsert, delete | /Client |
| Contracts | list, get, upsert, delete | /ClientContract |
| Downtime | list, get, upsert, delete | /Downtime |
| Feedback | list, get, upsert, delete | /Feedback |
| Fields | list, get, upsert, delete | /Field |
| Holidays | list, get, upsert, delete | /Holiday |
| Invoices | list, get, upsert, delete | /Invoice |
| Items | list, get, upsert, delete | /Item |
| Knowledge Base | list, get, upsert, delete | /KBArticle |
| Opportunities | list, get, upsert, delete | /Opportunities |
| Organisations | list, get, upsert, delete | /Organisation |
| Priorities | list, get, upsert, delete | /Priority |
| Projects | list, get, upsert, delete | /Projects |
| Purchase Orders | list, get, upsert, delete | /PurchaseOrder |
| Quotes | list, get, upsert, delete | /Quotation |
| Reports | list, get, upsert, delete | /Report |
| Services | list, get, upsert, delete | /Service |
| Service Status | list, get, upsert, delete | /ServiceStatus |
| Sites | list, get, upsert, delete | /Site |
| SLAs | list, get, upsert, delete | /SLA |
| Software Licences | list, get, upsert, delete | /SoftwareLicence |
| Status | list, get, upsert, delete | /Status |
| Suppliers | list, get, upsert, delete | /Supplier |
| Tags | list, get, upsert, delete | /Tags |
| Teams | list, get, upsert, delete | /Team |
| Ticket Rules | list, get, upsert, delete | /TicketRules |
| Ticket Types | list, get, upsert, delete | /TicketType |
| Timesheets | list, get, upsert | /Timesheet |
| Top Level | list, get, upsert, delete | /TopLevel |
| Users | list, get, upsert, delete | /Users |
| Workdays | list, get, upsert, delete | /Workday |
| Workflows | list, get, upsert, delete | /Workflow |

## Prerequisites

- Node.js 20 or later
- A Halo ITSM instance with API access enabled
- A Halo API application (Configuration > Integrations > HaloPSA API) with Client Credentials grant type

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/omichelbraga/halo-itsm-mcp.git
cd halo-itsm-mcp
npm install
npm run build
```

### 2. Configure

Copy the example environment file:

```bash
cp .env.example .env
```

Minimum configuration for OAuth proxy mode:

```env
HALO_BASE_URL=https://yourinstance.haloitsm.com
MCP_TRANSPORT=http
MCP_AUTH=oauth
MCP_PUBLIC_URL=https://your-public-url.com
```

### 3. Run

```bash
node --env-file=.env dist/index.js
```

The server starts on port 3000 and logs connection details to the console.

## Authentication Modes

### OAuth Proxy Mode (Recommended)

Credentials are passed by the MCP client at connection time. No secrets stored on the server.

```env
HALO_BASE_URL=https://yourinstance.haloitsm.com
MCP_TRANSPORT=http
MCP_AUTH=oauth
MCP_PUBLIC_URL=https://your-public-url.com
```

The server acts as an OAuth Authorization Server to the MCP client, then internally exchanges the credentials with Halo using Client Credentials grant. The Halo API application only needs Client Credentials enabled (not Authorization Code).

How the OAuth bridge works:

1. MCP client sends credentials via the standard OAuth Authorization Code + PKCE flow
2. Server auto-approves the authorization request (no user interaction)
3. Client exchanges the authorization code for a token
4. Server takes the client_id + client_secret and calls Halo's token endpoint with `grant_type=client_credentials`
5. The Halo access token is returned to the MCP client
6. All subsequent MCP API calls use the Halo token directly

### Environment Auth Mode

Credentials stored in environment variables. Useful for trusted environments or headless deployments.

```env
HALO_BASE_URL=https://yourinstance.haloitsm.com
HALO_CLIENT_ID=your_client_id
HALO_CLIENT_SECRET=your_client_secret
MCP_TRANSPORT=http
MCP_AUTH=env
```

### Stdio Mode

For local use with Claude Desktop or Claude Code. No HTTP server, communicates over stdin/stdout.

```env
HALO_BASE_URL=https://yourinstance.haloitsm.com
HALO_CLIENT_ID=your_client_id
HALO_CLIENT_SECRET=your_client_secret
```

Run without setting `MCP_TRANSPORT` (defaults to stdio).

## Connecting MCP Clients

### Claude.ai Connector

1. Run the server with `MCP_AUTH=oauth` behind HTTPS (reverse proxy or ngrok)
2. In Claude, go to Settings and add a new MCP integration:
   - **URL**: `https://your-public-url.com`
   - **OAuth Client ID**: your Halo API Client ID
   - **OAuth Client Secret**: your Halo API Client Secret
3. Claude will complete the OAuth handshake automatically

### n8n

1. Add an **MCP Client** node to your workflow
2. Configure the node:
   - **Server Transport**: HTTP Streamable
   - **MCP Endpoint URL**: `https://your-public-url.com/mcp`
   - **Authentication**: MCP OAuth2
3. Create a new MCP OAuth2 credential:
   - **Grant Type**: PKCE
   - **Authorization URL**: `https://your-public-url.com/authorize`
   - **Access Token URL**: `https://your-public-url.com/token`
   - **Client ID**: your Halo API Client ID
   - **Client Secret**: your Halo API Client Secret
   - **Scope**: `all`
   - **Authentication**: Body
4. Click **Connect to MCP**, then select your tool from the dropdown

> **Note**: Use the **PKCE** grant type in n8n, not plain Authorization Code. The MCP protocol requires PKCE (OAuth 2.1).

### Claude Desktop (stdio)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "halo-itsm": {
      "command": "node",
      "args": ["/path/to/halo-itsm-mcp/dist/index.js"],
      "env": {
        "HALO_BASE_URL": "https://yourinstance.haloitsm.com",
        "HALO_CLIENT_ID": "your_client_id",
        "HALO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Claude Code (stdio)

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "halo-itsm": {
      "command": "node",
      "args": ["--env-file=/path/to/.env", "/path/to/halo-itsm-mcp/dist/index.js"]
    }
  }
}
```

## Docker Deployment

### Build and run

```bash
docker build -t halo-itsm-mcp .
docker run -d \
  --name halo-itsm-mcp \
  -p 3000:3000 \
  -e HALO_BASE_URL=https://yourinstance.haloitsm.com \
  -e MCP_PUBLIC_URL=https://your-public-url.com \
  halo-itsm-mcp
```

### Docker Compose

```bash
# Configure .env with HALO_BASE_URL and MCP_PUBLIC_URL, then:
docker compose up -d
```

The container runs as a non-root user, exposes port 3000, and includes a health check at `/health`. Docker Compose also enforces a read-only filesystem, `no-new-privileges` security option, and resource limits (1 CPU / 512MB memory).

### Behind a Reverse Proxy

The server runs plain HTTP on port 3000. TLS termination is handled by your reverse proxy (nginx, Caddy, Traefik, etc.).

Set `MCP_PUBLIC_URL` to the external HTTPS URL so OAuth metadata and redirect URIs resolve correctly:

```env
MCP_PUBLIC_URL=https://halo-mcp.yourdomain.com
```

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name halo-mcp.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HALO_BASE_URL` | Yes | - | Halo instance URL (no trailing slash) |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_AUTH` | No | `env` | Auth mode: `env` or `oauth` |
| `MCP_PORT` | No | `3000` | HTTP server port |
| `MCP_PUBLIC_URL` | No | `http://localhost:3000` | External HTTPS URL (for OAuth metadata) |
| `HALO_CLIENT_ID` | env mode | - | Halo API Client ID |
| `HALO_CLIENT_SECRET` | env mode | - | Halo API Client Secret |
| `HALO_SCOPE` | No | `all` | API permission scope |
| `HALO_TENANT` | No | - | Tenant name (multi-tenant deployments) |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

## API Endpoints

When running in HTTP mode, the server exposes:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/mcp` | POST | Bearer | MCP message endpoint (initialize, tool calls) |
| `/mcp` | GET | Bearer | SSE stream for server-sent events |
| `/mcp` | DELETE | Bearer | Close an MCP session |
| `/health` | GET | None | Health check and server status |
| `/.well-known/oauth-authorization-server` | GET | None | OAuth server metadata (RFC 8414) |
| `/.well-known/oauth-protected-resource` | GET | None | Protected resource metadata (RFC 9728) |
| `/authorize` | GET | None | OAuth authorization endpoint |
| `/token` | POST | None | OAuth token endpoint |
| `/register` | POST | None | Dynamic client registration (RFC 7591) |

## Tool Reference

All tools follow the naming pattern `halo_{resource}_{operation}`:

| Operation | Description | Example |
|-----------|-------------|---------|
| `_list` | Search/list with filters and pagination | `halo_tickets_list` |
| `_get` | Get a single record by ID | `halo_tickets_get` |
| `_upsert` | Create (no id) or update (with id) | `halo_tickets_upsert` |
| `_delete` | Delete by ID | `halo_tickets_delete` |

Special tools:

| Tool | Description |
|------|-------------|
| `halo_agents_me` | Get the currently authenticated agent's info |

Common list parameters supported across all domains:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page_size` | number | Results per page (default varies by endpoint) |
| `page_no` | number | Page number (1-based) |
| `order` | string | Field to sort ascending |
| `orderdesc` | string | Field to sort descending |
| `search` | string | Full-text search query |

The `halo_tickets_list` tool supports 50+ additional filter parameters including `open_only`, `agent_id`, `status_id`, `priority_id`, `client_id`, `site_id`, `category_1`, `advanced_search`, and more. The `halo_categories_list` tool supports `type_id` (1-4) to filter by category level.

## Rate Limiting and Resilience

The server implements multiple layers of protection against API overuse and transient failures:

- **Sliding window rate limiter**: 700 requests per 5-minute window, with warnings at 80% capacity and automatic request delays when the limit is reached
- **Circuit breaker**: opens after 5 consecutive API failures, pauses all requests for 30 seconds, then auto-resets
- **Retry with exponential backoff**: 429 (rate limited) responses retry up to 3 times; 500/502/503 responses retry once. Backoff includes random jitter to prevent thundering herd
- **Token caching**: access tokens are cached in memory and auto-refreshed 60 seconds before expiry
- **Request deduplication**: concurrent token refresh requests are deduplicated to a single HTTP call
- **Automatic 401 recovery**: if a Halo API call returns 401, the token is force-refreshed and the request is retried once

## Health Check

The `/health` endpoint returns server status without requiring authentication:

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "server": "halo-itsm-mcp",
  "version": "1.0.0",
  "auth": "oauth-proxy",
  "instance": "https://yourinstance.haloitsm.com",
  "publicUrl": "https://your-public-url.com",
  "activeSessions": 2,
  "uptime": 3600.5
}
```

## Project Structure

```
halo-itsm-mcp/
├── src/
│   ├── index.ts                    # Entry point, transport setup, route config
│   ├── auth/
│   │   ├── oauth2.ts               # Client Credentials token management + caching
│   │   └── proxy-provider.ts       # Custom OAuth server (AuthCode+PKCE -> ClientCreds bridge)
│   ├── client/
│   │   ├── halo-client.ts          # HTTP client with retry, circuit breaker, token injection
│   │   └── rate-limiter.ts         # Sliding window rate limiter (700 req / 5 min)
│   ├── resources/
│   │   └── context.ts              # MCP read-only resources (config, schemas)
│   ├── tools/
│   │   ├── registry.ts             # Tool registry (builds and registers all 172 tools)
│   │   ├── resource-factory.ts     # Generic CRUD tool factory
│   │   └── resources/              # 43 resource domain definitions
│   │       ├── tickets.ts          # Ticket management (50+ filter params)
│   │       ├── actions.ts          # Ticket actions/notes
│   │       ├── agents.ts           # Agent management + /Agent/me
│   │       ├── assets.ts           # IT asset tracking
│   │       ├── asset-groups.ts     # Asset grouping
│   │       ├── asset-types.ts      # CMDB asset type definitions
│   │       ├── attachments.ts      # File attachments
│   │       ├── appointments.ts     # Scheduling
│   │       ├── audit.ts            # Audit trail
│   │       ├── canned-text.ts      # Response templates
│   │       ├── categories.ts       # Ticket categorization (4 levels)
│   │       ├── clients.ts          # Client/customer records
│   │       ├── contracts.ts        # Service contracts
│   │       ├── downtime.ts         # Maintenance windows
│   │       ├── feedback.ts         # Customer satisfaction
│   │       ├── fields.ts           # Custom field definitions
│   │       ├── holidays.ts         # Holiday schedules
│   │       ├── invoices.ts         # Billing
│   │       ├── items.ts            # Catalog items
│   │       ├── knowledge-base.ts   # KB articles
│   │       ├── opportunities.ts    # Sales opportunities
│   │       ├── organisations.ts    # Organizational structure
│   │       ├── priorities.ts       # Priority levels
│   │       ├── projects.ts         # Project management
│   │       ├── purchase-orders.ts  # IT procurement
│   │       ├── quotes.ts           # Quotes
│   │       ├── reports.ts          # Reports
│   │       ├── services.ts         # Service catalog
│   │       ├── service-status.ts   # Service status page
│   │       ├── sites.ts            # Locations
│   │       ├── sla.ts              # Service Level Agreements
│   │       ├── software-licences.ts # Software license tracking
│   │       ├── status.ts           # Status configuration
│   │       ├── suppliers.ts        # Supplier records
│   │       ├── tags.ts             # Ticket tagging
│   │       ├── teams.ts            # Team configuration
│   │       ├── ticket-rules.ts     # Auto-assignment rules
│   │       ├── ticket-types.ts     # Ticket type configuration
│   │       ├── timesheets.ts       # Time tracking
│   │       ├── top-level.ts        # Customer hierarchy
│   │       ├── users.ts            # End-user management
│   │       ├── workdays.ts         # Working day definitions
│   │       └── workflows.ts        # Workflow definitions
│   ├── types/
│   │   ├── config.ts               # Configuration interfaces, env loader
│   │   └── halo.ts                 # Halo API TypeScript type definitions
│   └── utils/
│       └── logger.ts               # Structured stderr logger with secret redaction
├── Dockerfile                      # Multi-stage Docker build (node:22-alpine)
├── docker-compose.yml              # Docker Compose with health check
├── .env.example                    # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│  MCP Client │────>│ Reverse Proxy│────>│     MCP Server          │────>│  Halo ITSM   │
│  (Claude,   │ TLS │ (nginx/ngrok)│ HTTP│     (Express)           │ API │  REST API    │
│   n8n, etc) │<────│              │<────│                         │<────│              │
└─────────────┘     └──────────────┘     │  ┌───────────────────┐  │     └──────────────┘
                                         │  │ OAuth Server      │  │
                                         │  │ (AuthCode -> CC)  │  │
                                         │  ├───────────────────┤  │
                                         │  │ Rate Limiter      │  │
                                         │  │ Circuit Breaker   │  │
                                         │  │ Token Cache       │  │
                                         │  │ Auto-PKCE         │  │
                                         │  └───────────────────┘  │
                                         └─────────────────────────┘
```

## Halo API Application Setup

1. In Halo ITSM, go to **Configuration > Integrations > HaloPSA API**
2. Create a new API application
3. Set **Auth Method** to **Client ID and Secret (Services)**
4. Under **Permissions**, grant access to the resource domains you need (or select all)
5. Copy the **Client ID** and **Client Secret**

The server uses Client Credentials grant regardless of the authentication mode selected. The OAuth proxy translates the MCP protocol's Authorization Code + PKCE flow into Client Credentials transparently.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run with environment file
node --env-file=.env dist/index.js

# Clean build artifacts
npm run clean
```

## Troubleshooting

**"Configuration error: HALO_BASE_URL required"**
Node.js doesn't auto-load `.env` files. Use `node --env-file=.env dist/index.js` instead of `node dist/index.js`.

**"Invalid Host" errors behind a reverse proxy**
The server binds to `0.0.0.0` with DNS rebinding protection disabled. Verify your `MCP_PUBLIC_URL` matches the external URL.

**"X-Forwarded-For" validation errors**
The server sets `trust proxy = 1` for single-proxy setups. If you have multiple proxy layers, adjust this value in `src/index.ts`.

**OAuth "unauthorized_client" from Halo**
Halo only supports Client Credentials grant. The MCP server handles the protocol translation automatically. Verify your Halo API application is configured for "Client ID and Secret (Services)", not Authorization Code.

**n8n "Could not load list"**
Verify the MCP Endpoint URL includes `/mcp` at the end (e.g., `https://your-url.com/mcp`). Use the **PKCE** grant type in n8n's credential, not plain Authorization Code.

**Token expires during long sessions**
The server caches tokens and refreshes them 60 seconds before expiry. For OAuth proxy mode, the MCP client handles token refresh via the standard OAuth refresh flow.

## Security

### Transport

The server runs plain HTTP internally. **TLS must be terminated by a reverse proxy** (nginx, Caddy, Traefik, etc.) in production. Set `MCP_PUBLIC_URL` to your external `https://` URL so OAuth metadata and redirects resolve correctly.

### Security Headers

All HTTP responses include the following headers:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### Input Validation

- All tool inputs are validated with Zod schemas before reaching the Halo API
- String parameters enforce maximum length limits (50-2000 characters depending on field)
- Array filter parameters are capped at 100 items
- Upsert data objects are limited to 512KB when serialized
- Request bodies are limited to 1MB via Express middleware

### Timeouts and Resilience

- All outbound fetch calls to Halo enforce a 10-15 second timeout via `AbortController`
- Rate limiter, circuit breaker, and retry logic protect against API overuse (see [Rate Limiting and Resilience](#rate-limiting-and-resilience))

### Secret Handling

- Client secrets captured during OAuth flows are stored with a 5-minute TTL and auto-cleaned
- The logger redacts 15+ sensitive field patterns (tokens, secrets, passwords, API keys) in both snake_case and camelCase
- Error messages returned to clients are sanitized; detailed error information is only written to server-side logs
- The `.env` file is excluded from both git and Docker builds

### Docker Hardening

The Docker Compose configuration enforces:

- **Non-root user** (`mcp:mcp`)
- **Read-only filesystem** with tmpfs for `/tmp`
- **`no-new-privileges`** security option
- **Resource limits**: 1 CPU / 512MB memory
- **Health check** at `/health`

### URL Validation

`HALO_BASE_URL` is validated at startup to ensure it is a well-formed `http://` or `https://` URL. Invalid URLs cause an immediate exit with a descriptive error.

### Reporting Vulnerabilities

If you discover a security vulnerability, please open an issue at [github.com/omichelbraga/halo-itsm-mcp/issues](https://github.com/omichelbraga/halo-itsm-mcp/issues).

## License

MIT
