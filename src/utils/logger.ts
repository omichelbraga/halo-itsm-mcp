/**
 * Halo ITSM MCP Server - Logger
 * Writes to stderr to avoid polluting MCP stdio transport on stdout.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    // Redact sensitive fields (snake_case and camelCase variants)
    const safe = { ...data };
    const sensitiveKeys = [
      "access_token", "accessToken",
      "refresh_token", "refreshToken",
      "id_token", "idToken",
      "client_secret", "clientSecret",
      "password", "token", "authorization",
      "secret", "api_key", "apiKey",
      "bearer", "credential", "credentials",
    ];
    for (const key of sensitiveKeys) {
      if (key in safe) safe[key] = "***REDACTED***";
    }
    return `${base} ${JSON.stringify(safe)}`;
  }
  return base;
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("debug")) process.stderr.write(formatMessage("debug", message, data) + "\n");
  },
  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("info")) process.stderr.write(formatMessage("info", message, data) + "\n");
  },
  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("warn")) process.stderr.write(formatMessage("warn", message, data) + "\n");
  },
  error(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("error")) process.stderr.write(formatMessage("error", message, data) + "\n");
  },
};
