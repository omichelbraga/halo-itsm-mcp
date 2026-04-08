/**
 * Halo ITSM MCP Server - OAuth2 Client Credentials Authentication
 *
 * Handles token acquisition, caching, and automatic refresh.
 * Tokens are cached in memory and refreshed 60 seconds before expiry.
 */

import { z } from "zod";
import { HaloConfig, CachedToken } from "../types/config.js";
import { logger } from "../utils/logger.js";

// Validate the shape of Halo's token response to catch malformed data early
const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().int().positive(),
});

const TOKEN_REFRESH_BUFFER_MS = 60_000; // Refresh 60s before expiry

export class HaloAuth {
  private config: HaloConfig;
  private cachedToken: CachedToken | null = null;
  private refreshPromise: Promise<string> | null = null;
  private staticToken: string | null = null;

  constructor(config: HaloConfig) {
    this.config = config;
  }

  /**
   * Set a static token (from OAuth proxy flow). When set, the auth module
   * uses this token directly instead of fetching via Client Credentials.
   */
  setStaticToken(token: string): void {
    this.staticToken = token;
  }

  /**
   * Set real Halo credentials for auto-refresh in OAuth proxy mode.
   * When set, the auth module can fetch new tokens via Client Credentials
   * when the initial token expires, instead of returning a stale static token.
   */
  setCredentials(clientId: string, clientSecret: string): void {
    this.config = { ...this.config, clientId, clientSecret };
    logger.debug("Credentials set for token auto-refresh");
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * If a static token is set (OAuth proxy mode) and we have credentials,
   * the static token is used initially but auto-refreshes via Client Credentials
   * when it approaches expiry.
   * Deduplicates concurrent refresh requests.
   */
  async getToken(): Promise<string> {
    // OAuth proxy mode with no credentials: return static token as-is
    if (this.staticToken && this.config.clientId === "oauth-proxy") {
      return this.staticToken;
    }

    // If we have a static token but also real credentials, treat the
    // static token as a cached token so it can be refreshed when expired
    if (this.staticToken && this.config.clientId !== "oauth-proxy") {
      // Seed the cache with the static token (assume ~1 hour validity)
      if (!this.cachedToken) {
        this.cachedToken = {
          accessToken: this.staticToken,
          expiresAt: Date.now() + 3500 * 1000, // ~58 minutes, will refresh before real expiry
        };
        logger.info("Seeded token cache from OAuth proxy token (auto-refresh enabled)");
      }
      this.staticToken = null; // Switch to managed mode
    }

    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.cachedToken.accessToken;
    }

    // Deduplicate concurrent token requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Force a token refresh (e.g., after a 401 response).
   */
  async forceRefresh(): Promise<string> {
    this.cachedToken = null;
    return this.getToken();
  }

  /**
   * Fetch a new token from the Halo auth endpoint.
   */
  private async fetchToken(): Promise<string> {
    const tokenUrl = `${this.config.baseUrl}/auth/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scope,
    });

    logger.debug("Requesting new access token", { tokenUrl });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: globalThis.Response;
    try {
      response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Token request timed out. The Halo server may be unresponsive.");
      }
      throw err;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Token request failed", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Authentication failed (${response.status}): ${response.statusText}`);
    }

    const raw = await response.json();
    const parsed = TokenResponseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.error("Invalid token response from Halo", { issues: parsed.error.issues });
      throw new Error("Received malformed token response from Halo");
    }
    const data = parsed.data;

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.info("Access token acquired", {
      expiresIn: data.expires_in,
      expiresAt: new Date(this.cachedToken.expiresAt).toISOString(),
    });

    return data.access_token;
  }

  /**
   * Check if we currently have a valid token.
   */
  isAuthenticated(): boolean {
    return this.cachedToken !== null && Date.now() < this.cachedToken.expiresAt;
  }
}
