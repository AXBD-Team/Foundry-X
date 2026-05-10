---
id: FX-DESIGN-379
sprint: 379
f_items: [F642]
status: design
created: 2026-05-10
---

# Sprint 379 Design — F642 trace_id chain enrichment

## §1 개요

`audit_logs` 테이블에 `trace_id` 컬럼을 추가하고, trace chain 조회 endpoint를 신설한다.

## §2 DB 스키마 변경

### Migration: `0154_audit_logs_trace_id.sql`

```sql
ALTER TABLE audit_logs ADD COLUMN trace_id TEXT;
CREATE INDEX idx_audit_trace_id ON audit_logs(trace_id) WHERE trace_id IS NOT NULL;
```

## §3 식별자 계약 (D2)

| 항목 | 규칙 |
|------|------|
| trace_id 포맷 | 임의 TEXT (UUID, `t-{uuid}`, 또는 caller-defined) |
| 생산자 | `createLog({ traceId?: string })` |
| 소비자 | `getByTraceId(traceId: string)` + GET `/audit/log/by-trace?trace_id=` |
| 정렬 | `created_at ASC` (chain 순서 보존) |

## §4 API 설계

### 신규: GET `/api/audit/log/by-trace`

```
Query: { trace_id: string }
Auth: JWT Bearer (기존 auditRoute auth 동일)
Response 200: { trace_id: string, events: AuditLog[], chain_valid: boolean }
Response 401: Unauthorized (인증 없을 시)
```

### chain_valid 판정 (simple v1)
- events.length > 0 이면 true
- events.length === 0 이면 false (trace 없음)

## §5 파일 매핑

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `packages/api/src/db/migrations/0154_audit_logs_trace_id.sql` | 신규 | ALTER + INDEX |
| `packages/api/src/core/harness/schemas/audit.ts` | 수정 | AuditEventSchema.trace_id + AuditLogSchema.trace_id + AuditLogByTraceResponseSchema 신설 |
| `packages/api/src/core/harness/services/audit-logger.ts` | 수정 | AuditEvent.traceId optional + AuditLog.traceId + logEvent INSERT + getByTraceId 신설 |
| `packages/api/src/core/harness/routes/audit.ts` | 수정 | getByTrace route + auditRoute.openapi 등록 |
| `packages/api/src/__tests__/audit-trace-chain.test.ts` | 신규 | TDD trace chain tests |

## §6 TDD 테스트 계약 (Red Target)

### `audit-trace-chain.test.ts`

```
describe("AuditLogService — trace_id chain")
  it("logEvent — traceId 포함 저장")
  it("getByTraceId — 동일 traceId 2건 정렬 반환")
  it("getByTraceId — 없는 traceId 빈 배열 반환")
  it("getByTraceId — created_at ASC 정렬 보장")
  it("getByTraceId — traceId 없는 로그와 격리")
```

## §7 회귀 보호

- 기존 `POST /api/audit/log` — traceId 없이도 정상 동작 (optional)
- 기존 `GET /api/audit/logs` — 동작 변경 없음 (필터 미추가)
- 기존 테스트 DDL에 `trace_id TEXT` 컬럼 추가 시 기존 테스트 호환 유지

## §8 Breaking Change 없음

ALTER TABLE ADD COLUMN은 기존 행의 값을 NULL로 초기화 — 기존 데이터 안전.
