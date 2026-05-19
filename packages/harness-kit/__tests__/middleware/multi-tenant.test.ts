// F676: createMultiTenantMiddleware TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMultiTenantMiddleware } from "../../src/middleware/multi-tenant.js";

function makeApp(cfg = {}) {
  const app = new Hono();
  app.use("*", createMultiTenantMiddleware(cfg));
  app.get("/test", (c) => c.json({ orgId: c.get("orgId"), orgRole: c.get("orgRole"), userId: c.get("userId") }));
  return app;
}

function makeReqWithJwt(orgId?: string, orgRole?: string, sub = "user-1") {
  const payload = orgId ? { sub, orgId, orgRole } : orgRole ? { sub, orgRole } : { sub };
  return { jwtPayload: payload };
}

describe("createMultiTenantMiddleware (F676)", () => {
  it("bypass path → next() without 403", async () => {
    const app = new Hono();
    app.use("*", createMultiTenantMiddleware({ bypassPaths: ["/health"] }));
    app.get("/health", (c) => c.text("ok"));
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("no jwtPayload → 403", async () => {
    const app = makeApp();
    const res = await app.request("/test");
    expect(res.status).toBe(403);
  });

  it("jwtPayload without orgId → 403", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("jwtPayload", { sub: "u1" }); await next(); });
    app.use("*", createMultiTenantMiddleware());
    app.get("/test", (c) => c.text("ok"));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
  });

  it("valid orgId → c.set orgId propagated", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("jwtPayload", { sub: "u1", orgId: "org-42" }); await next(); });
    app.use("*", createMultiTenantMiddleware());
    app.get("/test", (c) => c.json({ orgId: c.get("orgId") }));
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.orgId).toBe("org-42");
  });

  it("orgRole defaults to 'member'", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("jwtPayload", { sub: "u1", orgId: "org-1" }); await next(); });
    app.use("*", createMultiTenantMiddleware());
    app.get("/test", (c) => c.json({ orgRole: c.get("orgRole") }));
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.orgRole).toBe("member");
  });

  it("userId = payload.sub", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("jwtPayload", { sub: "user-99", orgId: "org-1" }); await next(); });
    app.use("*", createMultiTenantMiddleware());
    app.get("/test", (c) => c.json({ userId: c.get("userId") }));
    const res = await app.request("/test");
    const body = await res.json();
    expect(body.userId).toBe("user-99");
  });

  it("custom onMissingOrgId handler used", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => { c.set("jwtPayload", { sub: "u1" }); await next(); });
    app.use("*", createMultiTenantMiddleware({ onMissingOrgId: (c) => c.json({ custom: true }, 422) }));
    app.get("/test", (c) => c.text("ok"));
    const res = await app.request("/test");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.custom).toBe(true);
  });
});
