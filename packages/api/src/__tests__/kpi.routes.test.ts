// F604: KPI routes — GET /api/kpi + GET /api/kpi/:id
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { kpiApp } from "../core/kpi/routes/index.js";

const GRAPH_SESSIONS_DDL = `CREATE TABLE IF NOT EXISTS graph_sessions (
  id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', discovery_type TEXT,
  started_at TEXT NOT NULL, completed_at TEXT, error_msg TEXT
)`;

const FEEDBACK_QUEUE_DDL = `CREATE TABLE IF NOT EXISTS feedback_queue (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL, title TEXT NOT NULL, body TEXT, labels TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const AGENT_RUN_METRICS_DDL = `CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
  rounds INTEGER DEFAULT 0, stop_reason TEXT, duration_ms INTEGER, error_msg TEXT,
  started_at TEXT NOT NULL, finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const DUAL_AI_REVIEWS_DDL = `CREATE TABLE IF NOT EXISTS dual_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sprint_id INTEGER NOT NULL,
  claude_verdict TEXT, codex_verdict TEXT, codex_json TEXT NOT NULL,
  divergence_score REAL DEFAULT 0.0, decision TEXT, degraded INTEGER DEFAULT 0,
  degraded_reason TEXT, model TEXT, created_at TEXT DEFAULT (datetime('now'))
)`;

let db: ReturnType<typeof createMockD1>;

function makeEnv() {
  return { DB: db as unknown as D1Database };
}

beforeEach(async () => {
  db = createMockD1();
  await db.exec(GRAPH_SESSIONS_DDL);
  await db.exec(FEEDBACK_QUEUE_DDL);
  await db.exec(AGENT_RUN_METRICS_DDL);
  await db.exec(DUAL_AI_REVIEWS_DDL);
});

describe("GET /api/kpi — F604", () => {
  it("returns 200 with 9 kpis (F661 api_p99 추가)", async () => {
    const res = await kpiApp.request("/", {}, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json() as { kpis: unknown[]; computedAt: string };
    expect(body.kpis).toHaveLength(9);
    expect(typeof body.computedAt).toBe("string");
  });
});

describe("GET /api/kpi/:id — F604", () => {
  it("returns 200 for valid id", async () => {
    const res = await kpiApp.request("/bureau_active_count", {}, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json() as { id: string };
    expect(body.id).toBe("bureau_active_count");
  });

  it("returns 404 for unknown id", async () => {
    const res = await kpiApp.request("/nonexistent_kpi", {}, makeEnv());
    expect(res.status).toBe(404);
  });
});
