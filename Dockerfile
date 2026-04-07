# ============================================
# Halo ITSM MCP Server - Docker Image
# ============================================
# Multi-stage build: compile TypeScript, then run slim

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Prune dev dependencies
RUN npm prune --production

# --- Stage 2: Runtime ---
FROM node:22-alpine AS runtime

# Security: non-root user
RUN addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Default to HTTP transport with OAuth for Docker
ENV MCP_TRANSPORT=http
ENV MCP_AUTH=oauth
ENV MCP_PORT=3000
ENV LOG_LEVEL=info
ENV NODE_ENV=production

# Expose the MCP HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run as non-root
USER mcp

ENTRYPOINT ["node", "dist/index.js"]
