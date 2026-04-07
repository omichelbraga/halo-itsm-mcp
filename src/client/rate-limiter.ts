/**
 * Halo ITSM MCP Server - Rate Limiter
 *
 * Sliding window rate limiter enforcing Halo's 700 requests / 300 seconds limit.
 * Tracks request timestamps and delays requests that would exceed the limit.
 */

import { logger } from "../utils/logger.js";

const WINDOW_MS = 300_000;   // 5 minutes
const MAX_REQUESTS = 700;
const WARNING_THRESHOLD = 0.8; // Warn at 80% usage

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests = MAX_REQUESTS, windowMs = WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Wait until a request slot is available, then record the request.
   */
  async acquire(): Promise<void> {
    this.pruneOldEntries();

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitMs = oldestInWindow + this.windowMs - Date.now() + 100; // +100ms buffer
      if (waitMs > 0) {
        logger.warn(`Rate limit reached. Waiting ${waitMs}ms before next request.`);
        await this.delay(waitMs);
        this.pruneOldEntries();
      }
    }

    const usage = this.timestamps.length / this.maxRequests;
    if (usage >= WARNING_THRESHOLD) {
      logger.warn(`Rate limit at ${(usage * 100).toFixed(0)}% (${this.timestamps.length}/${this.maxRequests})`);
    }

    this.timestamps.push(Date.now());
  }

  /**
   * Get current rate limit status.
   */
  getStatus(): { used: number; remaining: number; windowMs: number; maxRequests: number } {
    this.pruneOldEntries();
    return {
      used: this.timestamps.length,
      remaining: Math.max(0, this.maxRequests - this.timestamps.length),
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }

  private pruneOldEntries(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
