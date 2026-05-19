import type { MiddlewareHandler } from "hono";

export interface RequestLoggerConfig {
  format?: "json" | "text";
  logger?: (line: string) => void;
  redactHeaders?: string[];
}

export function createRequestLoggerMiddleware(config: RequestLoggerConfig = {}): MiddlewareHandler {
  const format = config.format ?? "json";
  const log = config.logger ?? console.log;
  const redact = new Set((config.redactHeaders ?? ["authorization", "cookie"]).map((h) => h.toLowerCase()));

  return async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    await next();
    const duration = Date.now() - start;
    const status = c.res.status;
    const traceId = c.get("traceId") as string | undefined;

    if (format === "json") {
      log(JSON.stringify({ method, path, status, duration, traceId, timestamp: new Date().toISOString() }));
    } else {
      log(`[${new Date().toISOString()}] ${method} ${path} ${status} (${duration}ms)${traceId ? ` trace=${traceId}` : ""}`);
    }
  };
}
