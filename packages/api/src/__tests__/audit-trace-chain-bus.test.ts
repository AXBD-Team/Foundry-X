// F660: cross-table UNION test — audit_logs union audit_events + source meta
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { AuditLogService } from "../core/harness/services/audit-logger.js";

const AUDIT_LOGS_DDL = `CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  model_id TEXT,
  prompt_hash TEXT,
  input_classification TEXT DEFAULT 'internal',
  output_type TEXT,
  approved_by TEXT,
  approved_at TEXT,
  trace_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const AUDIT_EVENTS_DDL = `CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tenant_id TEXT,
  actor TEXT,
  payload TEXT NOT NULL,
  hmac_signature TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
)`;

describe("AuditLogService — cross-table UNION chain (F660)", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: AuditLogService;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(AUDIT_LOGS_DDL);
    await db.exec(AUDIT_EVENTS_DDL);
    service = new AuditLogService(db as unknown as D1Database);
  });

  it("UNION — audit_logs + audit_events 통합 chain 반환 (total 5 events)", async () => {
    await db
      .prepare(
        "INSERT INTO audit_logs (id, tenant_id, event_type, input_classification, trace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("log-1", "org_test", "agent_execution", "internal", "trace-union-001", "{}", "2026-01-01T10:00:00.000Z")
      .run();
    await db
      .prepare(
        "INSERT INTO audit_logs (id, tenant_id, event_type, input_classification, trace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("log-2", "org_test", "ai_review", "internal", "trace-union-001", "{}", "2026-01-01T11:00:00.000Z")
      .run();

    // 2026-01-01T12:00:00Z = 1735732800 seconds, *1000 = 1735732800000
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-union-001", "span-1", "cross_org.group_assigned", 1000, "org_test", "agent-a", "{}", "sig1", 1735736400000)
      .run();
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-union-001", "span-2", "ethics.threshold_violated", 2000, "org_test", "agent-b", "{}", "sig2", 1735740000000)
      .run();
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-union-001", "span-3", "diagnostic.completed", 3000, "org_test", null, "{}", "sig3", 1735743600000)
      .run();

    const result = await service.getByTraceId("trace-union-001");
    expect(result.traceId).toBe("trace-union-001");
    expect(result.events.length).toBe(5);
    expect(result.chainValid).toBe(true);
  });

  it("UNION — source 메타 정확 부여 (manual/live 구분)", async () => {
    await db
      .prepare(
        "INSERT INTO audit_logs (id, tenant_id, event_type, input_classification, trace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("log-src-1", "org_test", "agent_execution", "internal", "trace-source-001", "{}", "2026-01-01T10:00:00.000Z")
      .run();
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-source-001", "span-s1", "cross_org.export_blocked", 1000, "org_test", null, "{}", "sigX", 1735729200000)
      .run();

    const result = await service.getByTraceId("trace-source-001");
    expect(result.events.length).toBe(2);

    const manualEvent = result.events.find((e) => e.eventType === "agent_execution");
    const liveEvent = result.events.find((e) => e.eventType === "cross_org.export_blocked");
    expect(manualEvent?.source).toBe("manual");
    expect(liveEvent?.source).toBe("live");
  });

  it("UNION — audit_events만 있을 때 chain 정상 반환", async () => {
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-live-only", "span-lo1", "ethics.threshold_violated", 1000, "org_test", "agent-x", "{}", "sigA", 1735725600000)
      .run();
    await db
      .prepare(
        "INSERT INTO audit_events (trace_id, span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind("trace-live-only", "span-lo2", "diagnostic.completed", 2000, "org_test", null, "{}", "sigB", 1735729200000)
      .run();

    const result = await service.getByTraceId("trace-live-only");
    expect(result.events.length).toBe(2);
    expect(result.chainValid).toBe(true);
    expect(result.events.every((e) => e.source === "live")).toBe(true);
  });
});
