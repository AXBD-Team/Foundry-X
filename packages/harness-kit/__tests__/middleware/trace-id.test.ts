// F676: createTraceIdMiddleware TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createTraceIdMiddleware } from "../../src/middleware/trace-id.js";

describe("createTraceIdMiddleware (F676)", () => {
  it("uses incoming x-trace-id header when present", async () => {
    const app = new Hono();
    app.use("*", createTraceIdMiddleware());
    app.get("/test", (c) => c.json({ traceId: c.get("traceId") }));
    const res = await app.request("/test", { headers: { "x-trace-id": "existing-id" } });
    const body = await res.json();
    expect(body.traceId).toBe("existing-id");
  });

  it("generates new UUID when no header present", async () => {
    const app = new Hono();
    app.use("*", createTraceIdMiddleware());
    app.get("/test", (c) => c.json({ traceId: c.get("traceId") }));
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.traceId).toBeDefined();
    expect(typeof body.traceId).toBe("string");
    expect(body.traceId.length).toBeGreaterThan(0);
  });

  it("propagates traceId via c.set", async () => {
    let captured = "";
    const app = new Hono();
    app.use("*", createTraceIdMiddleware());
    app.get("/test", (c) => {
      captured = c.get("traceId") as string;
      return c.text("ok");
    });
    await app.request("/test", { headers: { "x-trace-id": "trace-abc" } });
    expect(captured).toBe("trace-abc");
  });

  it("adds x-trace-id to response headers", async () => {
    const app = new Hono();
    app.use("*", createTraceIdMiddleware());
    app.get("/test", (c) => c.text("ok"));
    const res = await app.request("/test", { headers: { "x-trace-id": "resp-id" } });
    expect(res.headers.get("x-trace-id")).toBe("resp-id");
  });

  it("custom header name used for incoming and outgoing", async () => {
    const app = new Hono();
    app.use("*", createTraceIdMiddleware({ header: "x-request-id" }));
    app.get("/test", (c) => c.json({ traceId: c.get("traceId") }));
    const res = await app.request("/test", { headers: { "x-request-id": "custom-123" } });
    const body = await res.json();
    expect(body.traceId).toBe("custom-123");
    expect(res.headers.get("x-request-id")).toBe("custom-123");
  });

  it("custom generator function used when no header", async () => {
    const generator = vi.fn(() => "fixed-trace-id");
    const app = new Hono();
    app.use("*", createTraceIdMiddleware({ generator }));
    app.get("/test", (c) => c.json({ traceId: c.get("traceId") }));
    const res = await app.request("/test");
    const body = await res.json();
    expect(generator).toHaveBeenCalled();
    expect(body.traceId).toBe("fixed-trace-id");
  });

  it("generated traceId matches response header and c.var", async () => {
    const app = new Hono();
    app.use("*", createTraceIdMiddleware());
    let varValue = "";
    app.get("/test", (c) => {
      varValue = c.get("traceId") as string;
      return c.text("ok");
    });
    const res = await app.request("/test");
    const headerValue = res.headers.get("x-trace-id");
    expect(varValue).toBeDefined();
    expect(varValue).toBe(headerValue);
  });
});
