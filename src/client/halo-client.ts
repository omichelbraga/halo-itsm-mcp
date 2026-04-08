/**
 * Halo ITSM MCP Server - HTTP Client
 *
 * Wraps all Halo API communication with:
 * - Automatic Bearer token injection
 * - Rate limiting
 * - Retry with exponential backoff
 * - Circuit breaker
 * - Timeout handling
 */

import { HaloConfig } from "../types/config.js";
import { HaloAuth } from "../auth/oauth2.js";
import { RateLimiter } from "./rate-limiter.js";
import { logger } from "../utils/logger.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const ATTACHMENT_TIMEOUT_MS = 120_000;
const MAX_RETRIES_RATE_LIMIT = 3;
const MAX_RETRIES_SERVER_ERROR = 1;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000;

interface RequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export class HaloClient {
  private auth: HaloAuth;
  private rateLimiter: RateLimiter;
  private config: HaloConfig;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(config: HaloConfig) {
    this.config = config;
    this.auth = new HaloAuth(config);
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Set a pre-existing Bearer token (from OAuth proxy flow).
   * The client will use this token for all API calls instead of
   * fetching its own via Client Credentials.
   */
  setToken(token: string): void {
    this.auth.setStaticToken(token);
  }

  /**
   * Set real Halo credentials so the client can auto-refresh tokens
   * via Client Credentials grant when the initial token expires.
   */
  setCredentials(clientId: string, clientSecret: string): void {
    this.auth.setCredentials(clientId, clientSecret);
  }

  /**
   * GET request to a Halo API collection endpoint.
   */
  async list<T = unknown>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", path, params });
  }

  /**
   * GET request for a single resource.
   */
  async get<T = unknown>(path: string, id: number | string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", path: `${path}/${id}`, params });
  }

  /**
   * POST request to create or update.
   */
  async post<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", path, body });
  }

  /**
   * DELETE request.
   */
  async delete<T = unknown>(path: string, id: number | string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", path: `${path}/${id}`, params });
  }

  /**
   * Get current rate limit status.
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Check if authenticated.
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * Core request method with retry, rate limiting, and circuit breaker.
   */
  private async request<T>(options: RequestOptions, retryCount = 0): Promise<ApiResponse<T>> {
    // Circuit breaker check
    if (Date.now() < this.circuitOpenUntil) {
      throw new Error(
        `Circuit breaker open. Too many consecutive failures. Retry after ${new Date(this.circuitOpenUntil).toISOString()}`
      );
    }

    // Rate limit
    await this.rateLimiter.acquire();

    // Build URL
    const url = new URL(`${this.config.baseUrl}/api${options.path}`);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value === undefined || value === null || value === "") continue;
        if (Array.isArray(value)) {
          url.searchParams.set(key, JSON.stringify(value));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Get token
    const token = await this.auth.getToken();
    const timeout = options.timeout || DEFAULT_TIMEOUT_MS;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const fetchOptions: RequestInit & { signal?: AbortSignal } = {
      method: options.method,
      headers,
    };

    if (options.body && (options.method === "POST")) {
      fetchOptions.body = JSON.stringify(Array.isArray(options.body) ? options.body : [options.body]);
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    const startTime = Date.now();

    try {
      logger.debug(`${options.method} ${url.pathname}`, {
        params: options.params ? Object.keys(options.params).join(",") : undefined,
      });

      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      logger.info(`${options.method} ${url.pathname} -> ${response.status} (${duration}ms)`);

      // Success - reset circuit breaker
      if (response.ok) {
        this.consecutiveFailures = 0;

        let data: T;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = (await response.json()) as T;
        } else {
          data = (await response.text()) as unknown as T;
        }

        return { ok: true, status: response.status, data };
      }

      // Handle specific error codes
      switch (response.status) {
        case 401: {
          // Token expired - force refresh and retry once
          if (retryCount === 0) {
            logger.warn("Received 401. Refreshing token and retrying.");
            await this.auth.forceRefresh();
            return this.request<T>(options, retryCount + 1);
          }
          this.recordFailure();
          throw new Error("Authentication failed after token refresh. Check your Halo credentials.");
        }

        case 429: {
          // Rate limited
          if (retryCount < MAX_RETRIES_RATE_LIMIT) {
            const retryAfter = response.headers.get("Retry-After");
            const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.backoffMs(retryCount);
            logger.warn(`Rate limited (429). Retry ${retryCount + 1}/${MAX_RETRIES_RATE_LIMIT} after ${waitMs}ms`);
            await this.delay(waitMs);
            return this.request<T>(options, retryCount + 1);
          }
          this.recordFailure();
          throw new Error("Rate limit exceeded after maximum retries.");
        }

        case 500:
        case 502:
        case 503: {
          if (retryCount < MAX_RETRIES_SERVER_ERROR) {
            const waitMs = this.backoffMs(retryCount);
            logger.warn(`Server error (${response.status}). Retrying after ${waitMs}ms`);
            await this.delay(waitMs);
            return this.request<T>(options, retryCount + 1);
          }
          this.recordFailure();
          const errorText = await response.text().catch(() => "");
          if (errorText) {
            logger.error("Halo server error details", { status: response.status, responseBody: errorText.substring(0, 1000) });
          }
          throw new Error(`Halo server error (${response.status}): ${response.statusText}`);
        }

        default: {
          const errorText = await response.text().catch(() => "");
          // Log full details server-side, return sanitized message to client
          if (errorText) {
            logger.error("Halo API error details", {
              status: response.status,
              path: options.path,
              responseBody: errorText.substring(0, 1000),
            });
          }
          let errorMessage = `Halo API error (${response.status}): ${response.statusText}`;
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.message) {
                // Sanitize: only include message field, limit length
                const safeMsg = String(errorJson.message).substring(0, 200);
                errorMessage += ` - ${safeMsg}`;
              }
            } catch {
              // Don't forward raw error text to client
            }
          }
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        this.recordFailure();
        throw new Error(`Request timed out after ${timeout}ms: ${options.method} ${options.path}`);
      }

      throw error;
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      logger.error(
        `Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. Reset at ${new Date(this.circuitOpenUntil).toISOString()}`
      );
    }
  }

  private backoffMs(retryCount: number): number {
    const base = 1000 * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
