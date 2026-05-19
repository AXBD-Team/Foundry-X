// F676: createRequestLoggerMiddleware TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createRequestLoggerMiddleware } from "../../src/middleware/request-logger.js";

describe("createRequestLoggerMiddleware (F676)", () => {
  it("logs in json format by default", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({ logger: (l) => lines.push(l) }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test");
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.method).toBe("GET");
    expect(parsed.path).toBe("/test");
    expect(parsed.status).toBe(200);
  });

  it("logs in text format when specified", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({ format: "text", logger: (l) => lines.push(l) }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test");
    expect(lines[0]).toMatch(/GET \/test 200/);
  });

  it("redacts authorization header from log", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({ logger: (l) => lines.push(l) }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test", { headers: { authorization: "Bearer secret-token" } });
    expect(lines[0]).not.toContain("secret-token");
  });

  it("records duration in milliseconds", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({ logger: (l) => lines.push(l) }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test");
    const parsed = JSON.parse(lines[0]!);
    expect(typeof parsed.duration).toBe("number");
    expect(parsed.duration).toBeGreaterThanOrEqual(0);
  });

  it("includes traceId from c.var when set", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("traceId", "trace-xyz"); await next(); });
    app.use("*", createRequestLoggerMiddleware({ logger: (l) => lines.push(l) }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test");
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.traceId).toBe("trace-xyz");
  });

  it("custom logger function is called", async () => {
    const customLogger = vi.fn();
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({ logger: customLogger }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test");
    expect(customLogger).toHaveBeenCalledOnce();
  });

  it("custom redactHeaders config works", async () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", createRequestLoggerMiddleware({
      redactHeaders: ["x-secret"],
      logger: (l) => lines.push(l),
    }));
    app.get("/test", (c) => c.text("ok"));
    await app.request("/test", { headers: { "x-secret": "do-not-log" } });
    expect(lines[0]).not.toContain("do-not-log");
  });
});
