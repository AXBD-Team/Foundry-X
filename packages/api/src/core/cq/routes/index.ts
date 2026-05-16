import { Hono } from "hono";
import { AuditBus, LLMService, generateTraceId, generateSpanId } from "../../infra/types.js";
import { CQEvaluator } from "../services/cq-evaluator.service.js";
import { ReviewCycle } from "../services/review-cycle.service.js";
import { EvaluateCQSchema, RegisterCQSchema, StartReviewCycleSchema } from "../schemas/cq.js";
import type { Env } from "../../../env.js";

// F665: AI 생성 CQ 차단 — author prefix 패턴 (docs/specs/fx-serverkit-native/cq-authoring-guide.md §6)
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i;
const CQ_MIN_CHARS = 50;

export const cqApp = new Hono<{ Bindings: Env }>();

function getServices(env: Env) {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  const llm = new LLMService(env.AI, env.ANTHROPIC_API_KEY);
  return {
    evaluator: new CQEvaluator(env.DB, llm, bus),
    cycle: new ReviewCycle(env.DB, llm, bus),
    bus,
  };
}

cqApp.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterCQSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { orgId, questionText, answerText, author } = parsed.data;

  if (AI_AUTHOR_BLOCKLIST.test(author)) {
    return c.json({ error: "AI-authored CQ rejected", author }, 400);
  }
  if (questionText.length < CQ_MIN_CHARS || answerText.length < CQ_MIN_CHARS) {
    return c.json({ error: `CQ too short (min ${CQ_MIN_CHARS} chars each)` }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO cq_questions (id, org_id, question_text, answer_text, answer_locked_at, author)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, orgId, questionText, answerText, Date.now(), author)
    .run();

  const { bus } = getServices(c.env);
  const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
  await bus.emit("cq.registered", { id, orgId, author, questionText: questionText.slice(0, 100) }, ctx);

  return c.json({ id }, 201);
});

cqApp.post("/evaluate", async (c) => {
  const body = await c.req.json();
  const parsed = EvaluateCQSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { evaluator } = getServices(c.env);
  const result = await evaluator.evaluate(parsed.data);
  return c.json(result, 200);
});

cqApp.post("/review-cycle/start", async (c) => {
  const body = await c.req.json();
  const parsed = StartReviewCycleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { cycle } = getServices(c.env);
  const result = await cycle.startCycle(parsed.data);
  return c.json(result, 201);
});

cqApp.get("/handoff-stats", async (c) => {
  const orgId = c.req.query("orgId");
  const where = orgId ? "WHERE org_id = ?" : "";
  const bindings = orgId ? [orgId] : [];

  const rows = await c.env.DB.prepare(
    `SELECT handoff_decision, COUNT(*) as count FROM cq_evaluations ${where} GROUP BY handoff_decision`,
  )
    .bind(...bindings)
    .all<{ handoff_decision: string; count: number }>();

  const stats = { handoff: 0, human_review: 0 };
  for (const row of rows.results ?? []) {
    if (row.handoff_decision === "handoff") stats.handoff = row.count;
    else if (row.handoff_decision === "human_review") stats.human_review = row.count;
  }
  return c.json(stats, 200);
});
