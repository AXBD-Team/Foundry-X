// F604: KPI Calculator 8 method happy path
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { KpiCalculatorService } from "../core/kpi/services/kpi-calculator.service.js";

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
  await db.exec(FEEDBACK_QUEUE_DDL);
  await db.exec(AGENT_RUN_METRICS_DDL);
  await db.exec(GRAPH_SESSIONS_DDL);
  await db.exec(DUAL_AI_REVIEWS_DDL);
  svc = new KpiCalculatorService(db as unknown as D1Database);
});

describe("KpiCalculatorService — F604", () => {
  it("calculateBureauActiveCount returns 0 on empty table", async () => {
    const result = await svc.calculateBureauActiveCount();
    expect(result.id).toBe("bureau_active_count");
    expect(result.value).toBe(0);
  });

  it("calculateBureauActiveCount counts distinct running orgs", async () => {
    await db.exec("INSERT INTO graph_sessions VALUES ('s1','b1','org-a','running',null,'2026-01-01',null,null)");
    await db.exec("INSERT INTO graph_sessions VALUES ('s2','b2','org-b','running',null,'2026-01-01',null,null)");
    await db.exec("INSERT INTO graph_sessions VALUES ('s3','b3','org-a','completed',null,'2026-01-01','2026-01-02',null)");
    const result = await svc.calculateBureauActiveCount();
    expect(result.value).toBe(2);
  });

  it("calculateCriticalInconsistencyRate returns null when empty", async () => {
    const result = await svc.calculateCriticalInconsistencyRate();
    expect(result.id).toBe("critical_inconsistency_rate");
    expect(result.value).toBeNull();
  });

  it("calculateCriticalInconsistencyRate computes rate", async () => {
    await db.exec("INSERT INTO feedback_queue (id, org_id, github_issue_number, github_issue_url, title, body, labels, status, created_at, updated_at) VALUES ('q1','org1',1,'http://u1','t1',null,'[]','failed',datetime('now'),datetime('now'))");
    await db.exec("INSERT INTO feedback_queue (id, org_id, github_issue_number, github_issue_url, title, body, labels, status, created_at, updated_at) VALUES ('q2','org1',2,'http://u2','t2',null,'[]','done',datetime('now'),datetime('now'))");
    const result = await svc.calculateCriticalInconsistencyRate();
    expect(result.value).toBe(50);
  });

  it("calculateAssetReuseRate returns null on empty table", async () => {
    const result = await svc.calculateAssetReuseRate();
    expect(result.id).toBe("asset_reuse_rate");
    expect(result.value).toBeNull();
  });

  it("calculateDiagnosticTimeReduction returns null on empty table", async () => {
    const result = await svc.calculateDiagnosticTimeReduction();
    expect(result.id).toBe("diagnostic_time_reduction");
    expect(result.value).toBeNull();
  });

  it("calculate5LayerE2ESuccessRate returns null on empty table", async () => {
    const result = await svc.calculate5LayerE2ESuccessRate();
    expect(result.id).toBe("five_layer_e2e_success_rate");
    expect(result.value).toBeNull();
  });

  it("calculate5LayerE2ESuccessRate computes rate", async () => {
    await db.exec("INSERT INTO graph_sessions VALUES ('s1','b1','o1','completed',null,'2026-01-01','2026-01-02',null)");
    await db.exec("INSERT INTO graph_sessions VALUES ('s2','b2','o1','failed',null,'2026-01-01',null,null)");
    const result = await svc.calculate5LayerE2ESuccessRate();
    expect(result.value).toBe(50);
  });

  it("calculateHitlAvgProcessing returns null on empty table", async () => {
    const result = await svc.calculateHitlAvgProcessing();
    expect(result.id).toBe("hitl_avg_processing");
    expect(result.value).toBeNull();
  });

  it("calculateApiP95 returns null on empty table", async () => {
    const result = await svc.calculateApiP95();
    expect(result.id).toBe("api_p95");
    expect(result.value).toBeNull();
  });

  it("calculateApiP95 returns correct p95", async () => {
    const vals = [100,200,300,400,500,600,700,800,900,1000];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      await db.exec("INSERT INTO agent_run_metrics VALUES ('m" + i + "','s1','a1','completed',0,100,10,1,null," + v + ",null,'2026-01-01',null,'2026-01-01')");
    }
    const result = await svc.calculateApiP95();
    expect(result.value).toBe(1000);
  });

  it("calculateCoreDiffBlockingRate returns null on empty table", async () => {
    const result = await svc.calculateCoreDiffBlockingRate();
    expect(result.id).toBe("core_diff_blocking_rate");
    expect(result.value).toBeNull();
  });

  it("computeAll returns 9 KPI results (F661 api_p99 추가)", async () => {
    const results = await svc.computeAll();
    expect(results).toHaveLength(9);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("bureau_active_count");
    expect(ids).toContain("api_p99");
    expect(ids).toContain("core_diff_blocking_rate");
  });
});
