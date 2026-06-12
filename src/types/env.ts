/**
 * Cloudflare Workers Env interface
 *
 * Secrets set via:
 *   wrangler secret put ORION_SUPABASE_URL --env staging
 *   wrangler secret put ORION_SUPABASE_SERVICE_ROLE_KEY --env staging
 *   wrangler secret put JWT_SECRET --env staging
 *   wrangler secret put MCP_PUBLIC_URL --env staging
 *   (repeat with --env production)
 *
 * Non-secret vars live in wrangler.toml [env.X].vars
 */
export interface Env {
  ORION_SUPABASE_URL: string
  ORION_SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
  MCP_PUBLIC_URL: string
  LOG_LEVEL?: string
  NODE_ENV?: string
}

/**
 * Adapter for Node.js / Express local dev path.
 * Reads from process.env — NOT for CF Workers runtime.
 */
export function fromProcess(): Env {
  return {
    ORION_SUPABASE_URL: process.env.ORION_SUPABASE_URL!,
    ORION_SUPABASE_SERVICE_ROLE_KEY: process.env.ORION_SUPABASE_SERVICE_ROLE_KEY!,
    JWT_SECRET: process.env.JWT_SECRET!,
    MCP_PUBLIC_URL: process.env.MCP_PUBLIC_URL ?? 'http://localhost:3000',
    LOG_LEVEL: process.env.LOG_LEVEL,
    NODE_ENV: process.env.NODE_ENV,
  }
}
