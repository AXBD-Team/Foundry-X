import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { AuditLogService } from "../core/harness/services/audit-logger.js";

const AUDIT_DDL = `CREATE TABLE IF NOT EXISTS audit_logs (
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

describe("AuditLogService — trace_id chain (F642)", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: AuditLogService;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(AUDIT_DDL);
    await db.exec(
      "CREATE INDEX IF NOT EXISTS idx_audit_trace_id ON audit_logs(trace_id) WHERE trace_id IS NOT NULL",
    );
    // F660: add audit_events table so UNION query does not error in existing tests
    await db.exec(`CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      span_id TEXT NOT NULL,
      parent_span_id TEXT,
      event_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tenant_id TEXT,
      actor TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      hmac_signature TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )`);
    service = new AuditLogService(db as unknown as D1Database);
  });

  it("logEvent — traceId 포함 저장", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "agent_execution",
      traceId: "trace-abc-001",
    });
    expect(result.recorded).toBe(true);
    const row = await db
      .prepare("SELECT trace_id FROM audit_logs WHERE id = ?")
      .bind(result.id)
      .first<{ trace_id: string | null }>();
    expect(row?.trace_id).toBe("trace-abc-001");
  });

  it("logEvent — traceId 없이도 정상 저장 (optional)", async () => {
    const result = await service.logEvent({
      tenantId: "org_test",
      eventType: "code_commit",
    });
    expect(result.recorded).toBe(true);
    const row = await db
      .prepare("SELECT trace_id FROM audit_logs WHERE id = ?")
      .bind(result.id)
      .first<{ trace_id: string | null }>();
    expect(row?.trace_id).toBeNull();
  });

  it("getByTraceId — 동일 traceId 2건 반환", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "agent_execution", traceId: "trace-001" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_review", traceId: "trace-001" });
    await service.logEvent({ tenantId: "org_test", eventType: "code_commit" });

    const result = await service.getByTraceId("trace-001");
    expect(result.traceId).toBe("trace-001");
    expect(result.events.length).toBe(2);
    expect(result.chainValid).toBe(true);
  });

  it("getByTraceId — 없는 traceId 빈 배열 반환", async () => {
    const result = await service.getByTraceId("nonexistent-trace");
    expect(result.events.length).toBe(0);
    expect(result.chainValid).toBe(false);
  });

  it("getByTraceId — created_at ASC 정렬 보장", async () => {
    const id1 = "audit-test-sort-1";
    const id2 = "audit-test-sort-2";
    await db
      .prepare(
        "INSERT INTO audit_logs (id, tenant_id, event_type, input_classification, trace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id1, "org_test", "agent_execution", "internal", "trace-sort", "{}", "2026-01-01T10:00:00.000Z")
      .run();
    await db
      .prepare(
        "INSERT INTO audit_logs (id, tenant_id, event_type, input_classification, trace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id2, "org_test", "ai_review", "internal", "trace-sort", "{}", "2026-01-01T11:00:00.000Z")
      .run();

    const result = await service.getByTraceId("trace-sort");
    expect(result.events.length).toBe(2);
    expect(result.events[0]!.id).toBe(id1);
    expect(result.events[1]!.id).toBe(id2);
  });

  it("getByTraceId — traceId 없는 로그와 격리", async () => {
    await service.logEvent({ tenantId: "org_test", eventType: "code_commit" });
    await service.logEvent({ tenantId: "org_test", eventType: "ai_generation", traceId: "trace-isolated" });

    const result = await service.getByTraceId("trace-isolated");
    expect(result.events.length).toBe(1);
    expect(result.events[0]!.eventType).toBe("ai_generation");
  });
});
