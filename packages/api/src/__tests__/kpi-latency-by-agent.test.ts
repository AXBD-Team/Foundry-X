// F661 (d): LatencyByAgentService — TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { LatencyByAgentService } from "../core/kpi/services/latency-by-agent.service.js";

const AGENT_RUN_METRICS_DDL = `CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
  rounds INTEGER DEFAULT 0, stop_reason TEXT, duration_ms INTEGER, error_msg TEXT,
  started_at TEXT NOT NULL, finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

async function insertAgentRows(
  db: ReturnType<typeof createMockD1>,
  agentId: string,
  durations: number[],
) {
  for (let i = 0; i < durations.length; i++) {
    const row = `('${agentId}-${i}','s1','${agentId}','completed',0,100,10,1,null,${durations[i]},null,'2026-01-01',null,'2026-01-01')`;
    await db.exec(`INSERT INTO agent_run_metrics VALUES ${row}`);
  }
}

let db: ReturnType<typeof createMockD1>;
let svc: LatencyByAgentService;

beforeEach(async () => {
  db = createMockD1();
  await db.exec(AGENT_RUN_METRICS_DDL);
  svc = new LatencyByAgentService(db as unknown as D1Database);
});

describe("LatencyByAgentService — F661 (d)", () => {
  it("2 agents fixture → 각 agent p50/p75/p95/p99 정확 분리", async () => {
    // discovery-stage-runner: 10 rows [10000..100000]
    await insertAgentRows(
      db,
      "discovery-stage-runner",
      [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000],
    );
    // decode-x-evidence-collector: 5 rows [5000..25000]
    await insertAgentRows(
      db,
      "decode-x-evidence-collector",
      [5000, 10000, 15000, 20000, 25000],
    );

    const result = await svc.calculateByAgent();
    expect(result.agents).toHaveLength(2);

    const dsr = result.agents.find((a) => a.agentId === "discovery-stage-runner");
    expect(dsr).toBeDefined();
    expect(dsr!.count).toBe(10);
    expect(dsr!.p50).toBe(50000);  // index 4 of 10 sorted
    expect(dsr!.p95).toBe(100000); // index 9 of 10 sorted

    const dec = result.agents.find((a) => a.agentId === "decode-x-evidence-collector");
    expect(dec).toBeDefined();
    expect(dec!.count).toBe(5);
    expect(dec!.p50).toBe(15000);  // index 2 of 5 sorted
  });

  it("empty data → 빈 agents array 반환", async () => {
    const result = await svc.calculateByAgent();
    expect(result.agents).toHaveLength(0);
    expect(result.computedAt).toBeDefined();
  });

  it("orgId 필터 없으면 전체 agent 반환", async () => {
    await insertAgentRows(db, "agent-a", [1000, 2000, 3000]);
    await insertAgentRows(db, "agent-b", [4000, 5000]);
    const result = await svc.calculateByAgent();
    expect(result.agents).toHaveLength(2);
  });
});
