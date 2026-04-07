/**
 * Halo ITSM MCP Server - Configuration Types
 */

export interface HaloConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  tenant?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Validate that a URL is well-formed and uses an allowed protocol.
 */
function validateUrl(raw: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL: ${raw}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https (got ${parsed.protocol})`);
  }
  return parsed;
}

export function loadConfig(): HaloConfig {
  const baseUrl = process.env.HALO_BASE_URL;
  const clientId = process.env.HALO_CLIENT_ID;
  const clientSecret = process.env.HALO_CLIENT_SECRET;

  if (!baseUrl) throw new Error("HALO_BASE_URL environment variable is required");
  if (!clientId) throw new Error("HALO_CLIENT_ID environment variable is required");
  if (!clientSecret) throw new Error("HALO_CLIENT_SECRET environment variable is required");

  validateUrl(baseUrl, "HALO_BASE_URL");

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    clientId,
    clientSecret,
    scope: process.env.HALO_SCOPE || "all",
    tenant: process.env.HALO_TENANT || undefined,
    logLevel: (process.env.LOG_LEVEL as HaloConfig["logLevel"]) || "info",
  };
}

export { validateUrl };
