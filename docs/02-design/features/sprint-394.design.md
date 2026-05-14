---
code: FX-DSGN-394
title: Sprint 394 — F660 audit-bus 통합 view + traceId 전파 Design
version: 1.0
status: Active
category: DESIGN
sprint: 394
feature: F660
req: FX-REQ-722
session: S360
date: 2026-05-14
related:
  - docs/01-plan/features/sprint-394.plan.md
  - packages/api/src/core/harness/services/audit-logger.ts
  - packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts
  - packages/api/src/core/ethics/services/ethics-enforcer.service.ts
  - packages/api/src/core/diagnostic/services/diagnostic-engine.service.ts
---

# Sprint 394 — F660 Design

## 1. 설계 개요

3-part 병렬 구현:
- **(a)** `getByTraceId` cross-table UNION: `audit_logs ∪ audit_events` + `source` 메타
- **(b)** 4 endpoint body.traceId 수용 + audit-bus emit context 전파
- **(c)** Frontend `/audit/by-trace` 라우트 + `TraceChainView` 컴포넌트

## 2. Part (a) — audit-logger UNION 설계

### 2.1 UNION 쿼리 설계

`audit_logs`와 `audit_events`는 컬럼 구조가 다름:

| 컬럼 | audit_logs | audit_events | UNION projection |
|------|-----------|--------------|-----------------|
| id | TEXT (UUID) | INTEGER (autoincrement) | CAST(id AS TEXT) |
| trace_id | TEXT | TEXT | trace_id |
| event_type | TEXT | TEXT | event_type |
| agent_id | TEXT nullable | actor TEXT nullable | agent_id/actor → agent_id |
| tenant_id | TEXT | tenant_id TEXT nullable | tenant_id |
| created_at | TEXT ISO8601 | INTEGER unix_ms | CAST(created_at AS TEXT) |
| metadata/payload | TEXT JSON | TEXT JSON | metadata/payload → metadata |
| source | - | - | 'manual' / 'live' |

**정렬 기준**: `created_at ASC`. audit_logs는 ISO8601 TEXT, audit_events는 unix_ms INTEGER — SQLite에서 두 형식을 직접 비교하면 정렬 오류. 해결: audit_events `created_at`을 ISO8601로 변환 (`datetime(created_at / 1000, 'unixepoch')`)

```sql
SELECT
  CAST(id AS TEXT) as id,
  trace_id,
  event_type,
  agent_id,
  tenant_id,
  created_at,
  metadata,
  'manual' as source
FROM audit_logs
WHERE trace_id = ?
UNION ALL
SELECT
  CAST(id AS TEXT) as id,
  trace_id,
  event_type,
  actor as agent_id,
  tenant_id,
  datetime(created_at / 1000, 'unixepoch') as created_at,
  payload as metadata,
  'live' as source
FROM audit_events
WHERE trace_id = ?
ORDER BY created_at ASC
```

### 2.2 타입 확장

```typescript
// AuditLog에 source 필드 추가 (optional — 기존 caller 호환)
export interface AuditLog {
  // ... existing fields ...
  source?: "manual" | "live";
}

// TraceChainResult는 변경 없음 (events: AuditLog[] 그대로 — source 포함됨)
```

### 2.3 기존 5 test case 회귀 전략

기존 test는 `audit_logs` only — UNION 후에도 `audit_events` DDL이 없으면 동작 안 할 수 있음.
해결: 신규 test 파일(`audit-trace-chain-bus.test.ts`)에서 두 테이블 모두 생성. 기존 test 파일은 수정 없이 유지 (UNION 쿼리가 `audit_events` 없는 환경에서 SQLite에러 발생 가능 — 기존 test 파일에 `audit_events` DDL 추가 필요).

→ **결정**: 기존 `audit-trace-chain.test.ts`에 `audit_events` DDL을 `beforeEach`에 추가 (CREATE TABLE IF NOT EXISTS — 기존 동작 무변화).

## 3. Part (b) — traceId 전파 설계

### 3.1 서비스 레이어 변경

**cross-org-enforcer.service.ts**:
```typescript
// assignGroup input에 traceId? 추가
async assignGroup(input: {
  assetId: string;
  // ...
  traceId?: string;  // NEW
}): Promise<GroupAssignment> {
  // ...
  const ctx = { traceId: input.traceId ?? generateTraceId(), ... }; // line 65
}

// checkExport: input.traceId 이미 존재 — ctx 사용만 변경
async checkExport(input: { assetId: string; traceId?: string; ... }) {
  // ...
  const ctx = { traceId: input.traceId ?? generateTraceId(), ... }; // line 119 변경
}
```

**ethics-enforcer.service.ts**:
```typescript
// makeCtx 함수 signature 변경
function makeCtx(traceId?: string) {
  return { traceId: traceId ?? generateTraceId(), spanId: generateSpanId(), sampled: true };
}

// checkConfidence에서 호출 시
const ctx = makeCtx(input.callMeta.traceId); // traceId 전달
```

**diagnostic-engine.service.ts**:
```typescript
// runAll signature 변경
async runAll(orgId: string, types: DiagnosticType[], traceId?: string) {
  // ...
  const ctx = { traceId: traceId ?? generateTraceId(), ... }; // line 124 변경
}
```

### 3.2 Schema 변경

**cross-org/schemas/cross-org.ts**: `AssignGroupSchema`에 `traceId: z.string().optional()` 추가
**diagnostic/schemas/diagnostic.ts**: `RunDiagnosticSchema`에 `traceId: z.string().optional()` 추가

### 3.3 Route 레이어 변경

**cross-org assign-group route**:
```typescript
crossOrgApp.post("/assign-group", async (c) => {
  const body = await c.req.json();
  const parsed = AssignGroupSchema.safeParse(body);
  // parsed.data now includes traceId?
  const assignment = await getEnforcer(c.env).assignGroup(parsed.data);
  return c.json(assignment, 200);
});
```

**cross-org check-export route**: 이미 `parsed.data`에 `traceId?` 포함 — 변경 없음

**diagnostic run route**:
```typescript
diagnosticApp.post("/run", async (c) => {
  // parsed.data now includes traceId?
  const report = await engine.runAll(parsed.data.orgId, parsed.data.diagnosticTypes, parsed.data.traceId);
  return c.json(report, 200);
});
```

**ethics check-confidence route**: `parsed.data` 그대로 전달 → `checkConfidence(parsed.data)` 변경 없음. 서비스 레이어에서 `makeCtx(input.callMeta.traceId)` 호출.

### 3.4 MSA 경계 유지

- route layer가 body에서 traceId 추출 → 서비스 전달 (OK: route→service 단방향)
- audit-logger(harness domain)는 직접 cross-org/ethics/diagnostic import 없음 (MSA boundary 유지)
- 변경 파일이 모두 자기 도메인 내부 — cross-domain import 0건 추가

## 4. Part (c) — Frontend 설계

### 4.1 라우트 파일

`packages/web/src/routes/audit-by-trace.tsx`
- React Router 7 convention: export default page component
- path: `/audit/by-trace` (query param: `?traceId=...`)

### 4.2 TraceChainView 컴포넌트

`packages/web/src/components/audit/TraceChainView.tsx`
- Props: `{ traceId: string; events: TraceEvent[]; chainValid: boolean }`
- 시간순 vertical timeline
- source별 색상: `manual` = 파란색, `live` = 초록색
- 각 event: `eventType`, `agentId`, `tenantId`, `createdAt`, `source` badge

### 4.3 타입 정의

`packages/web/src/components/audit/types.ts`:
```typescript
export interface TraceEvent {
  id: string;
  traceId: string | null;
  eventType: string;
  agentId: string | null;
  tenantId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  source?: "manual" | "live";
}

export interface TraceChainResult {
  traceId: string;
  events: TraceEvent[];
  chainValid: boolean;
}
```

## 5. 파일 매핑 (§5 표준)

### 수정 (Modify)

| # | 파일 | 변경 내용 |
|---|------|----------|
| M1 | `packages/api/src/core/harness/services/audit-logger.ts` | `AuditLog.source?` 필드 추가 + `getByTraceId` UNION 쿼리 |
| M2 | `packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts` | `assignGroup` traceId? + line 65/119 prefer input.traceId |
| M3 | `packages/api/src/core/ethics/services/ethics-enforcer.service.ts` | `makeCtx(traceId?)` + checkConfidence 전달 |
| M4 | `packages/api/src/core/diagnostic/services/diagnostic-engine.service.ts` | `runAll(traceId?)` + line 124 prefer param |
| M5 | `packages/api/src/core/cross-org/schemas/cross-org.ts` | `AssignGroupSchema` traceId? 추가 |
| M6 | `packages/api/src/core/diagnostic/schemas/diagnostic.ts` | `RunDiagnosticSchema` traceId? 추가 |
| M7 | `packages/api/src/core/diagnostic/routes/index.ts` | runAll 호출에 traceId 전달 |
| M8 | `packages/api/src/__tests__/audit-trace-chain.test.ts` | beforeEach에 audit_events DDL 추가 (IF NOT EXISTS) |

### 신규 (New)

| # | 파일 | 목적 |
|---|------|------|
| N1 | `packages/api/src/__tests__/audit-trace-chain-bus.test.ts` | (a) cross-table UNION 3 cases + source 검증 |
| N2 | `packages/api/src/__tests__/traceid-propagation.test.ts` | (b) 4 endpoint × 2 = 8 propagation test |
| N3 | `packages/web/src/routes/audit-by-trace.tsx` | (c) 라우트 |
| N4 | `packages/web/src/components/audit/TraceChainView.tsx` | (c) timeline 컴포넌트 |
| N5 | `packages/web/src/components/audit/types.ts` | (c) TraceEvent type |
| N6 | `packages/web/src/components/audit/index.ts` | (c) re-export |

### D1 Migration

없음 — 기존 `audit_logs` + `audit_events` 테이블 그대로 활용.

## 6. TDD Red Phase 계약

### 6.1 audit-trace-chain-bus.test.ts (N1)

```
describe("AuditLogService — cross-table UNION chain (F660)")
  it("UNION — audit_logs + audit_events 통합 chain 반환")  // 5 events total
  it("UNION — source 메타 정확 부여")                      // manual/live 구분
  it("UNION — audit_events만 있을 때 chain 정상")          // logs empty, events 2
```

### 6.2 traceid-propagation.test.ts (N2)

```
describe("traceId 전파 — 4 endpoint (F660)")
  it("cross-org assignGroup — body.traceId prefer")
  it("cross-org assignGroup — traceId 없으면 generateTraceId fallback")
  it("cross-org checkExport blocked — body.traceId prefer")
  it("cross-org checkExport blocked — traceId 없으면 generateTraceId fallback")
  it("ethics makeCtx — traceId 인자 있으면 prefer")
  it("ethics makeCtx — traceId 없으면 generateTraceId fallback")
  it("diagnostic runAll — traceId 인자 있으면 prefer")
  it("diagnostic runAll — traceId 없으면 generateTraceId fallback")
```

## 7. D1/D2/D3/D4 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | M1~M8 전수 grep 완료. audit-logger 1사이트, cross-org 2사이트, ethics 1사이트, diagnostic 1사이트 |
| D2 | 식별자 계약 | traceId는 `generateTraceId()` 함수로 생성되는 UUID-like string. input.traceId 있으면 그대로 사용 (포맷 무제한 — 외부에서 전달) |
| D3 | Breaking change 영향 | AuditLog.source? 추가 = 기존 필드 제거 없음 → 기존 caller 100% 호환. AuditLogByTraceResponseSchema에 source 추가 필요 |
| D4 | TDD Red 파일 존재 | 신규 N1+N2 Red 커밋으로 확인 |
