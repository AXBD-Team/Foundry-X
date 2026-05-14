// F661 (a): api_p99 KPI — TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { KpiCalculatorService } from "../core/kpi/services/kpi-calculator.service.js";
import { KPI_IDS } from "../core/kpi/types.js";

const AGENT_RUN_METRICS_DDL = `CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
  rounds INTEGER DEFAULT 0, stop_reason TEXT, duration_ms INTEGER, error_msg TEXT,
  started_at TEXT NOT NULL, finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const FEEDBACK_QUEUE_DDL = `CREATE TABLE IF NOT EXISTS feedback_queue (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  labels TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const GRAPH_SESSIONS_DDL = `CREATE TABLE IF NOT EXISTS graph_sessions (
  id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', discovery_type TEXT,
  started_at TEXT NOT NULL, completed_at TEXT, error_msg TEXT
)`;

const DUAL_AI_REVIEWS_DDL = `CREATE TABLE IF NOT EXISTS dual_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sprint_id INTEGER NOT NULL,
  claude_verdict TEXT, codex_verdict TEXT, codex_json TEXT NOT NULL,
  divergence_score REAL DEFAULT 0.0, decision TEXT, degraded INTEGER DEFAULT 0,
  degraded_reason TEXT, model TEXT, created_at TEXT DEFAULT (datetime('now'))
)`;

let db: ReturnType<typeof createMockD1>;
let svc: KpiCalculatorService;

beforeEach(async () => {
  db = createMockD1();
  await db.exec(AGENT_RUN_METRICS_DDL);
  await db.exec(FEEDBACK_QUEUE_DDL);
  await db.exec(GRAPH_SESSIONS_DDL);
  await db.exec(DUAL_AI_REVIEWS_DDL);
  svc = new KpiCalculatorService(db as unknown as D1Database);
});

describe("KpiCalculatorService — F661 (a) api_p99", () => {
  it("calculateApiP99 — 100 rows fixture에서 99th percentile 정확 반환", async () => {
    // 100 rows: 1000ms ~ 100000ms (1000ms 간격)
    for (let i = 1; i <= 100; i++) {
      await db.exec(
        `INSERT INTO agent_run_metrics VALUES ('m${i}','s1','discovery-stage-runner','completed',0,100,10,1,null,${i * 1000},null,'2026-01-01',null,'2026-01-01')`,
      );
    }
    const result = await svc.calculateApiP99();
    // 99th percentile (1-based) = index 98 (0-based) of sorted ASC = 99000ms
    expect(result.id).toBe("api_p99");
    expect(result.value).toBe(99000);
    expect(result.unit).toBe("ms");
    expect(result.threshold).toBe(41000);
  });

  it("calculateApiP99 — empty data → null 반환 (graceful fallback)", async () => {
    const result = await svc.calculateApiP99();
    expect(result.id).toBe("api_p99");
    expect(result.value).toBeNull();
  });

  it("KPI_IDS enum에 api_p99 포함 + computeAll 응답에 api_p99 항목 존재", async () => {
    expect(KPI_IDS).toContain("api_p99");
    const results = await svc.computeAll();
    const ids = results.map((r) => r.id);
    expect(ids).toContain("api_p99");
    expect(ids).toContain("api_p95");
    // api_p99는 api_p95 바로 다음 순서
    const p95Idx = ids.indexOf("api_p95");
    const p99Idx = ids.indexOf("api_p99");
    expect(p99Idx).toBe(p95Idx + 1);
  });
});
