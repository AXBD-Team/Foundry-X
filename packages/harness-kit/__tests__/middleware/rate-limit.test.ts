// F676: createRateLimitMiddleware TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createRateLimitMiddleware } from "../../src/middleware/rate-limit.js";

function makeApp(cfg: Parameters<typeof createRateLimitMiddleware>[0]) {
  const app = new Hono();
  app.use("*", createRateLimitMiddleware(cfg));
  app.get("/test", (c) => c.text("ok"));
  return app;
}

describe("createRateLimitMiddleware (F676)", () => {
  it("requests below limit are allowed", async () => {
    const app = makeApp({ limit: 3, windowSec: 60 });
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/test");
      expect(res.status).toBe(200);
    }
  });

  it("exceeding limit returns 429", async () => {
    const app = makeApp({ limit: 2, windowSec: 60 });
    await app.request("/test");
    await app.request("/test");
    const res = await app.request("/test");
    expect(res.status).toBe(429);
  });

  it("sets Retry-After header on 429", async () => {
    const app = makeApp({ limit: 1, windowSec: 30 });
    await app.request("/test");
    const res = await app.request("/test");
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("counter resets after window expires", async () => {
    vi.useFakeTimers();
    const app = makeApp({ limit: 1, windowSec: 1 });
    await app.request("/test");
    vi.advanceTimersByTime(1500);
    const res = await app.request("/test");
    expect(res.status).toBe(200);
    vi.useRealTimers();
  });

  it("custom keyFn determines rate limit key", async () => {
    const keyFn = vi.fn(() => "custom-key");
    const app = makeApp({ limit: 1, windowSec: 60, keyFn });
    await app.request("/test");
    await app.request("/test");
    expect(keyFn).toHaveBeenCalled();
  });

  it("KV-backed: uses KV when binding provided", async () => {
    const kvStore = new Map<string, string>();
    const mockKv = {
      get: vi.fn(async (key: string, type: string) => {
        const val = kvStore.get(key);
        return val ? JSON.parse(val) : null;
      }),
      put: vi.fn(async (key: string, val: string) => { kvStore.set(key, val); }),
    };
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ limit: 2, windowSec: 60, kvBinding: "KV" }));
    app.get("/test", (c) => c.text("ok"));
    const makeReq = () => {
      return app.fetch(new Request("http://localhost/test"), { KV: mockKv });
    };
    const r1 = await makeReq();
    expect(r1.status).toBe(200);
    const r2 = await makeReq();
    expect(r2.status).toBe(200);
    const r3 = await makeReq();
    expect(r3.status).toBe(429);
  });

  it("no KV binding → in-memory fallback", async () => {
    const app = makeApp({ limit: 2, windowSec: 60 });
    await app.request("/test");
    await app.request("/test");
    const res = await app.request("/test");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/rate limit/i);
  });
});
