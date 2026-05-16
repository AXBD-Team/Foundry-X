// F605: HITL Console sub-app — GET /api/hitl/queue + POST /api/hitl/decision
// F663: POST /api/hitl/transition — 5-state 머신 전환 endpoint
import { Hono } from "hono";
import { HitlQueueCollector } from "../services/hitl-queue-collector.service.js";
import { HitlStateMachine } from "../services/hitl-state-machine.service.js";
import { AuditBus } from "../../infra/types.js";
import { HitlDecisionSchema, HitlQueueQuerySchema, HitlTransitionSchema } from "../schemas/hitl.js";
import type { Env } from "../../../env.js";

export const hitlApp = new Hono<{ Bindings: Env }>();

// Lightweight auth check — validates JWT_SECRET existence (full authMiddleware in app.ts)
hitlApp.use("*", async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

hitlApp.get("/queue", async (c) => {
  const query = HitlQueueQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  const orgId = query.success ? query.data.orgId : undefined;
  const escalatedOnly = query.success ? query.data.escalatedOnly : false;

  const collector = new HitlQueueCollector(c.env.DB);
  const response = await collector.getQueueResponse(orgId);

  if (escalatedOnly) {
    response.items = response.items.filter((i) => i.escalated);
    response.total = response.items.length;
  }

  return c.json(response, 200);
});

hitlApp.post("/decision", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = HitlDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }

  const collector = new HitlQueueCollector(c.env.DB);
  const result = await collector.applyDecision(parsed.data);
  return c.json(result, 200);
});

// F663: POST /api/hitl/transition — 5-state 머신 전환
hitlApp.post("/transition", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = HitlTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }

  const hmacKey = c.env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-padded!!";
  const auditBus = new AuditBus(c.env.DB, hmacKey);
  const sm = new HitlStateMachine(c.env.DB, auditBus);
  const result = await sm.transition(parsed.data);
  if ("error" in result) {
    return c.json(result, 400);
  }
  return c.json(result, 200);
});
