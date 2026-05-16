# Sprint 396 — F662 CQ graph_session hook Integration Report

**날짜**: 2026-05-16  
**세션**: S362  
**Sprint**: 396  
**F-item**: F662

## P-a: D1 migration 0155 생성

```
packages/api/src/db/migrations/0155_cq_evaluations_graph_session.sql
  ALTER TABLE cq_evaluations ADD COLUMN graph_session_id TEXT;
  ALTER TABLE cq_evaluations ADD COLUMN failure_reason TEXT;
  CREATE INDEX IF NOT EXISTS idx_cq_evaluations_graph_session ON cq_evaluations(graph_session_id);
```

Latest migration before: `0154_audit_logs_trace_id.sql`  
New migration: `0155_cq_evaluations_graph_session.sql`

## P-b: autoTriggerCQEvaluator 동작 확인

`discovery-stage-runner.ts:87-122` (autoTriggerCQEvaluator) 신규 추가.  
run-all handler line 305에서 호출:
```typescript
const cqTask = autoTriggerCQEvaluator(c.env.DB, sessionId, orgId, apiKey, result)
  .catch((e) => console.error("[F662] CQ auto-trigger failed:", e));
c.executionCtx.waitUntil(Promise.all([metaTask, cqTask]));
```

## P-c: graph_session_id INSERT 검증

Integration test T4 PASS:
```
✓ T4: graphSessionId 제공 → cq_evaluations INSERT에 graph_session_id 포함 (2ms)
```

D1 mock bind() capture → args.includes(graphSessionId) = true

## P-d: failure_reason 자동 분류

```
✓ T5: 파싱 성공 + totalScore<90 → failureReason='human_error' (1ms)
✓ T6: LLM 응답 파싱 실패 → failureReason='infra_issue' (0ms)
```

## P-e: audit-bus emit cq.evaluated payload

T5 검증:
```typescript
const evalCall = emitCalls.find((c) => c[0] === "cq.evaluated");
expect(evalCall?.[1]).toMatchObject({ failureReason: "human_error", graphSessionId });
// → PASS
```

## P-f: 회귀 0 확인

```
Test Files  267 passed | 1 skipped (268)
Tests  2466 passed | 2 skipped (2468)
```

F632 T1~T3 + F662 T4~T7 = 7/7 CQ tests PASS.  
F606/F607 audit-bus trace_id chain T1~T2 PASS.

## P-g: typecheck PASS

```
pnpm exec tsc --noEmit  →  0 errors (turbo 우회, S337 rule 적용)
```

## reports/ 디렉토리 실파일 ls

```
sprint-396-cq-hook-integration.md        ← 본 파일
sprint-396-failure-classification-samples.md ← 분류 샘플 3건+
```
