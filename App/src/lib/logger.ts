type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const SENSITIVE_KEYS = ["token", "password", "authorization", "apiKey", "secret"];

function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskValue);
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEYS.some((needle) => key.toLowerCase().includes(needle.toLowerCase()));
      next[key] = isSensitive ? "***redacted***" : maskValue(nested);
    }
    return next;
  }

  return value;
}

function write(level: LogLevel, event: string, context?: LogContext): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    context: context ? maskValue(context) : undefined,
  };

  const printer =
    level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.info;
  printer(`[app] ${event}`, payload);
}

export const logger = {
  debug: (event: string, context?: LogContext) => write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};

