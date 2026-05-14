// F660: traceId propagation test — 4 endpoint body.traceId prefer over generateTraceId
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CrossOrgEnforcer } from "../core/cross-org/services/cross-org-enforcer.service.js";
import { EthicsEnforcer } from "../core/ethics/services/ethics-enforcer.service.js";
import { DiagnosticEngine } from "../core/diagnostic/services/diagnostic-engine.service.js";
import type { AuditBus } from "../core/infra/types.js";

const CROSS_ORG_GROUPS_DDL = `CREATE TABLE IF NOT EXISTS cross_org_groups (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  asset_kind TEXT NOT NULL,
  org_id TEXT NOT NULL,
  group_type TEXT NOT NULL,
  commonality REAL,
  variance REAL,
  documentation_rate REAL,
  business_impact TEXT,
  assigned_by TEXT NOT NULL DEFAULT 'manual',
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  UNIQUE (asset_id, asset_kind)
)`;

const CROSS_ORG_EXPORT_BLOCKS_DDL = `CREATE TABLE IF NOT EXISTS cross_org_export_blocks (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  attempted_action TEXT,
  trace_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
)`;

const ETHICS_VIOLATIONS_DDL = `CREATE TABLE IF NOT EXISTS ethics_violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  threshold_value REAL NOT NULL DEFAULT 0,
  actual_value REAL NOT NULL DEFAULT 0,
  trace_id TEXT,
  escalated_to_human INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
)`;

const DIAGNOSTIC_RUNS_DDL = `CREATE TABLE IF NOT EXISTS diagnostic_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  diagnostic_types TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  summary TEXT,
  started_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  completed_at INTEGER
)`;

const DIAGNOSTIC_FINDINGS_DDL = `CREATE TABLE IF NOT EXISTS diagnostic_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  diagnostic_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
)`;

const BIZ_ITEMS_DDL = `CREATE TABLE IF NOT EXISTS biz_items (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  external_id TEXT,
  title TEXT
)`;

const SERVICE_ENTITIES_DDL = `CREATE TABLE IF NOT EXISTS service_entities (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  besir_type TEXT,
  status TEXT,
  metadata TEXT,
  org_id TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const ENTITY_LINKS_DDL = `CREATE TABLE IF NOT EXISTS entity_links (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

function makeMockBus() {
  const capturedCtxs: Array<{ traceId: string }> = [];
  const bus = {
    emit: vi.fn(async (_event: string, _payload: unknown, ctx: { traceId: string }) => {
      capturedCtxs.push(ctx);
    }),
  } as unknown as Pick<AuditBus, "emit">;
  return { bus, capturedCtxs };
}

describe("traceId 전파 — 4 endpoint (F660)", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(CROSS_ORG_GROUPS_DDL);
    await db.exec(CROSS_ORG_EXPORT_BLOCKS_DDL);
    await db.exec(ETHICS_VIOLATIONS_DDL);
    await db.exec(DIAGNOSTIC_RUNS_DDL);
    await db.exec(DIAGNOSTIC_FINDINGS_DDL);
    await db.exec(BIZ_ITEMS_DDL);
    await db.exec(SERVICE_ENTITIES_DDL);
    await db.exec(ENTITY_LINKS_DDL);
  });

  it("cross-org assignGroup — body.traceId 있으면 emit ctx에 prefer", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    await enforcer.assignGroup({
      assetId: "asset-tg-001",
      assetKind: "process",
      orgId: "org_test",
      groupType: "org_specific",
      traceId: "external-trace-001",
    });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(capturedCtxs[0]!.traceId).toBe("external-trace-001");
  });

  it("cross-org assignGroup — traceId 없으면 generateTraceId fallback", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    await enforcer.assignGroup({
      assetId: "asset-tg-002",
      assetKind: "process",
      orgId: "org_test",
      groupType: "org_specific",
    });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(typeof capturedCtxs[0]!.traceId).toBe("string");
    expect(capturedCtxs[0]!.traceId.length).toBeGreaterThan(0);
  });

  it("cross-org checkExport blocked — body.traceId 있으면 emit ctx에 prefer", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    await db
      .prepare("INSERT INTO cross_org_groups (id, asset_id, asset_kind, org_id, group_type, assigned_by) VALUES (?, ?, ?, ?, ?, ?)")
      .bind("grp-1", "asset-block-001", "process", "org_test", "core_differentiator", "manual")
      .run();

    await enforcer.checkExport({ assetId: "asset-block-001", traceId: "external-trace-002" });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    const lastCtx = capturedCtxs.at(-1);
    expect(lastCtx?.traceId).toBe("external-trace-002");
  });

  it("cross-org checkExport blocked — traceId 없으면 generateTraceId fallback", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    await db
      .prepare("INSERT INTO cross_org_groups (id, asset_id, asset_kind, org_id, group_type, assigned_by) VALUES (?, ?, ?, ?, ?, ?)")
      .bind("grp-2", "asset-block-002", "process", "org_test", "core_differentiator", "manual")
      .run();

    await enforcer.checkExport({ assetId: "asset-block-002" });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(typeof capturedCtxs.at(-1)?.traceId).toBe("string");
    expect((capturedCtxs.at(-1)?.traceId ?? "").length).toBeGreaterThan(0);
  });

  it("ethics checkConfidence — callMeta.traceId 있으면 emit ctx에 prefer", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new EthicsEnforcer(db as unknown as D1Database, bus);

    await enforcer.checkConfidence({
      orgId: "org_test",
      agentId: "agent-e1",
      callMeta: { confidence: 0.3, callId: "call-001", traceId: "external-trace-eth-001" },
    });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(capturedCtxs[0]!.traceId).toBe("external-trace-eth-001");
  });

  it("ethics checkConfidence — traceId 없으면 generateTraceId fallback", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const enforcer = new EthicsEnforcer(db as unknown as D1Database, bus);

    await enforcer.checkConfidence({
      orgId: "org_test",
      agentId: "agent-e2",
      callMeta: { confidence: 0.3, callId: "call-002" },
    });

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(typeof capturedCtxs[0]!.traceId).toBe("string");
    expect(capturedCtxs[0]!.traceId.length).toBeGreaterThan(0);
  });

  it("diagnostic runAll — traceId 인자 있으면 emit ctx에 prefer", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const engine = new DiagnosticEngine(db as unknown as D1Database, bus);

    await engine.runAll("org_test", ["missing"], "external-trace-diag-001");

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(capturedCtxs.at(-1)?.traceId).toBe("external-trace-diag-001");
  });

  it("diagnostic runAll — traceId 없으면 generateTraceId fallback", async () => {
    const { bus, capturedCtxs } = makeMockBus();
    const engine = new DiagnosticEngine(db as unknown as D1Database, bus);

    await engine.runAll("org_test", ["missing"]);

    expect(capturedCtxs.length).toBeGreaterThan(0);
    expect(typeof capturedCtxs.at(-1)?.traceId).toBe("string");
    expect((capturedCtxs.at(-1)?.traceId ?? "").length).toBeGreaterThan(0);
  });
});
