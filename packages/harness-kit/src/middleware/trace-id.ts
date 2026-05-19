import type { MiddlewareHandler } from "hono";

export interface TraceIdConfig {
  header?: string;
  generator?: () => string;
}

export function createTraceIdMiddleware(config: TraceIdConfig = {}): MiddlewareHandler {
  const headerName = config.header ?? "x-trace-id";
  const gen = config.generator ?? (() => crypto.randomUUID());

  return async (c, next) => {
    const incoming = c.req.header(headerName);
    const traceId = incoming ?? gen();
    c.set("traceId", traceId);
    c.header(headerName, traceId);
    await next();
  };
}
