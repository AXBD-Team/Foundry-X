import type { Context, MiddlewareHandler } from "hono";

export interface RateLimitConfig {
  limit: number;
  windowSec: number;
  keyFn?: (c: Context) => string;
  kvBinding?: string;
}

interface RateEntry {
  count: number;
  reset: number;
}

type KVNamespaceLike = {
  get(key: string, type: "json"): Promise<RateEntry | null>;
  put(key: string, value: string, options?: { expiration?: number }): Promise<void>;
};

export function createRateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler {
  const memory = new Map<string, RateEntry>();

  function tooMany(c: Context, entry: RateEntry): Response {
    const retryAfter = Math.ceil((entry.reset - Date.now()) / 1000);
    c.header("Retry-After", String(Math.max(retryAfter, 1)));
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  return async (c, next) => {
    const key = config.keyFn?.(c) ?? c.req.header("CF-Connecting-IP") ?? "anonymous";
    const now = Date.now();

    if (config.kvBinding) {
      const kv = (c.env as Record<string, unknown>)[config.kvBinding] as KVNamespaceLike | undefined;
      if (kv) {
        const stored = await kv.get(key, "json");
        const entry: RateEntry =
          stored && stored.reset > now ? stored : { count: 0, reset: now + config.windowSec * 1000 };
        if (entry.count >= config.limit) {
          return tooMany(c, entry);
        }
        entry.count++;
        await kv.put(key, JSON.stringify(entry), { expiration: Math.ceil(entry.reset / 1000) });
        return next();
      }
    }

    const entry = memory.get(key);
    if (!entry || entry.reset <= now) {
      memory.set(key, { count: 1, reset: now + config.windowSec * 1000 });
      return next();
    }
    if (entry.count >= config.limit) {
      return tooMany(c, entry);
    }
    entry.count++;
    return next();
  };
}
