---
code: FX-PLAN-396
title: F662 CQ 5축 평가 — graph_session 종결 hook 연결 + 실패 분류 (gap fill)
version: 1.0
status: Active
category: Plan
phase: 47
sprint: 396
f_items:
  - F662
req:
  - FX-REQ-724
priority: P0
created: 2026-05-16
session: S362
---

# Sprint 396 — F662 CQ 5축 평가 graph_session hook 연결 (gap fill)

## §1 컨텍스트

S361 ServerKit Native PRD-final §4.1 #1+#2 진행. **사전 측정 결과 (S362, fs 실측 26회차)** F662 baseline이 이미 **F632 era에 상당 부분 구축됨** 발견.

### 기존 baseline (F632 era 흔적)

- `packages/api/src/core/cq/` 디렉토리 **이미 존재** (515 LOC 누적)
  - `services/cq-evaluator.service.ts` (120L) — `CQEvaluator` class + `evaluate()` method
  - `services/review-cycle.service.ts` (94L) — `ReviewCycle` (80-20-80 4-stage cycle, F663 영역과 일부 overlap)
  - `routes/index.ts` (73L) — `/api/cq/register` + `/api/cq/evaluate` + `/api/cq/review-cycle`
  - `schemas/cq.ts` (47L) — Zod
  - `types.ts` (63L) — `CQ_AXES` + `CQ_AXIS_WEIGHTS` (25/20/15/30/10) + `AxisScore` + `CQEvaluationResult` + `CQHandoffDecision`
  - `cq-evaluator.test.ts` (118L)
- D1 migration `0144_cq_evaluations.sql` **이미 적용** — 3 테이블 (cq_questions + cq_evaluations + cq_review_cycles) FK + CHECK + 4 index
- `app.ts:145` `app.route("/api/cq", cqApp)` **이미 mount**
- `CQEvaluator.evaluate()` 동작 검증됨 — Sonnet single call + 5축 weighted total + `totalScore >= 90 ? "handoff" : "human_review"` 분기 + `auditBus.emit("cq.evaluated"/"cq.handoff", trace_id)` 모두 동작

### F662 PRD vs 실측 drift

- F662 row "마이그레이션 0165 신규" → **실제 다음 migration = 0155** (latest 0154_audit_logs_trace_id)
- F662 row "cq_evaluations D1 schema 신규" → **이미 0144에 존재** ✅
- F662 row "별 평가 에이전트 graph_session 종결 hook 자동 호출" → service 존재, **hook 연결 미수행** ❌ (진정한 gap)
- F662 row "<90점 자동 분류 (휴먼 에러 vs 인프라 이슈)" → **분기 로직 부재** ❌

## §2 사전 측정 (fs 실측)

```
Latest D1 migration: 0154_audit_logs_trace_id.sql → 신규 0155
graph_session 종결 hook: discovery-stage-runner.ts:270 (autoTriggerMetaAgent 호출점)
Audit Bus: packages/api/src/core/infra/audit-bus.ts ✅ (emit + generateTraceId)
F606/F607 ✅ MERGED, F604/F605 ✅ MERGED
MODEL_SONNET = "claude-sonnet-4-6" (@foundry-x/shared/model-defaults)
core/cq/ 5 dir + 6 files (test 1) = 515 LOC baseline
```

## §3 범위 (Gap fill scope)

### (a) D1 migration `0155_cq_evaluations_graph_session.sql` 신규

```sql
-- F662: graph_session 종결 hook 자동 호출 + 실패 분류
ALTER TABLE cq_evaluations ADD COLUMN graph_session_id TEXT;
ALTER TABLE cq_evaluations ADD COLUMN failure_reason TEXT;
-- failure_reason CHECK 표현 (SQLite ALTER ADD CHECK 미지원 → service 레이어 검증)
CREATE INDEX IF NOT EXISTS idx_cq_evaluations_graph_session ON cq_evaluations(graph_session_id);
```

> SQLite/D1 한계로 question_id NOT NULL 유지 — graph_session 자동 호출은 **synthetic cq_question 자동 등록 패턴** 사용 (autoTriggerCQEvaluator에서 placeholder question_id 생성 후 INSERT).

### (b) `discovery-stage-runner.ts:270~` autoTriggerCQEvaluator 신규 + 호출

```typescript
// Line 23 부근에 신규 함수 export
export async function autoTriggerCQEvaluator(
  db: D1Database,
  graphSessionId: string,
  orgId: string,
  apiKey: string,
  graphResult: unknown,
): Promise<void> { /* ... */ }

// Line 270 부근 (autoTriggerMetaAgent 호출 직후)에 추가
const cqTask = autoTriggerCQEvaluator(
  c.env.DB, sessionId, orgId, apiKey, result
).catch((e) => console.error("[F662] CQ auto-trigger failed:", e));
try { c.executionCtx.waitUntil(cqTask); } catch { /* non-Worker */ }
```

### (c) CQEvaluator service 확장

- `evaluate()` parameter에 optional `graphSessionId?: string` 추가
- INSERT 시 `graph_session_id` 컬럼 채움
- `totalScore < 90` 일 때 `failure_reason` 자동 분류 (heuristic 또는 별도 prompt):
  - LLM response empty/error → `infra_issue`
  - LLM response 정상 but 점수 미달 → `human_error`
  - INSERT 시 `failure_reason` 컬럼 채움
- audit-bus emit 시 graphSessionId + failureReason payload 포함

### (d) types.ts 확장

- `FailureReason` type 추가: `'human_error' | 'infra_issue' | null`
- `CQEvaluationResult`에 `graphSessionId?: string` + `failureReason?: FailureReason` optional 추가

### (e) Integration test 신규

- `packages/api/src/core/cq/__tests__/cq-graph-hook.test.ts` (또는 cq-evaluator.test.ts에 추가) — discovery-stage-runner CQ hook trigger + cq_evaluations INSERT 검증 + audit-bus emit 검증

## §4 구현 단계 (TDD Red → Green)

1. **Red**: cq-graph-hook test 작성 (FAIL 확인)
   - graph_session 종결 → autoTriggerCQEvaluator 호출 → cq_evaluations INSERT 1건 + graph_session_id 채워짐 검증
   - <90점 케이스 → failure_reason='human_error' 또는 'infra_issue' 채워짐 검증
2. **Green Step 1**: migration 0155 작성 + apply
3. **Green Step 2**: types.ts FailureReason + CQEvaluationResult 확장
4. **Green Step 3**: CQEvaluator.evaluate() graphSessionId + failure_reason 로직
5. **Green Step 4**: discovery-stage-runner.ts autoTriggerCQEvaluator 신규 + 호출 추가
6. typecheck + tests GREEN 확증
7. PR 생성 + auto-merge

## §5 파일 매핑

### 신규
- `packages/api/src/db/migrations/0155_cq_evaluations_graph_session.sql` (~15L)
- `packages/api/src/core/cq/__tests__/cq-graph-hook.test.ts` (~80L, integration mock)

### 수정
- `packages/api/src/core/cq/types.ts` (+5L FailureReason + 2 optional fields)
- `packages/api/src/core/cq/services/cq-evaluator.service.ts` (+25L graphSessionId param + failure_reason 분류)
- `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` (+40L autoTriggerCQEvaluator export + waitUntil 호출)

### 산출물 (reports — S360 hallucination 회피 강제)
- `reports/sprint-396-cq-hook-integration.md` — graph_session_id 채워진 cq_evaluations 실파일 생성 증거
- `reports/sprint-396-failure-classification-samples.md` — <90 케이스 휴먼/인프라 분류 샘플 3건+
- `docs/02-design/features/sprint-396.design.md` — autopilot 자동 생성
- `docs/04-report/features/sprint-396.report.md` — autopilot 자동 생성
- `docs/metrics/velocity/sprint-396.json` — autopilot 자동 생성 (f_items "F662" 정확 + duration 정확)

## §6 Out-of-scope

- **F663 80-20-80 HITL workflow** — 별 sprint (Sprint 397). ReviewCycle.ts 이미 존재하지만 5-state 머신 (`AI_GENERATED → REVIEW_QUEUED → HUMAN_REVIEWED → AI_REVISED → FINAL_APPROVED`) 신설은 F663 영역.
- **F664 HITL Console UI** — Sprint 398.
- **F665 CQ 작성 가이드** — Sprint 398+.
- **5축 정확도 정밀화** — 본 sprint MVP 임시정의 유지 (ontology_usage = 4-Asset Model 활용률 임시 측정, Phase 4+ 확장)
- **별 평가 Worker 격리 + KV 캐싱** — Phase 2 백로그 (PRD §11 위험 대응)
- **CQ 평가 결과 dashboard UI** — F662 본 범위 외 (별 sprint 후속)

## §7 Phase Exit P-a~P-h (Smoke Reality 8항)

| # | 항목 | 판정 기준 |
|---|------|----------|
| **P-a** | migration 0155 apply 정상 + 컬럼 추가 검증 | `wrangler d1 execute foundry-x-db --remote --command "PRAGMA table_info(cq_evaluations)"` → graph_session_id + failure_reason 컬럼 존재 확인 |
| **P-b** | 평가 에이전트 1회 Sonnet API call 동작 | mock 또는 실 호출 — LLM response 정상 처리 |
| **P-c** | cq_evaluations INSERT 시 graph_session_id 채워짐 | integration test 1건 PASS, INSERT row의 graph_session_id 값 검증 |
| **P-d** | <90점 케이스 failure_reason 자동 분류 동작 | human_error / infra_issue 분기 라벨링 test PASS |
| **P-e** | audit-bus emit `cq.evaluated` + trace_id chainValid=true | audit_events row 검증 (trace_id INSERT) |
| **P-f** | F632 baseline 회귀 0 + F606/F607 회귀 0 | 기존 cq-evaluator.test 118L + audit-bus.test 모두 GREEN |
| **P-g** | `pnpm exec tsc --noEmit` PASS (turbo 우회, S337 rule 정확 적용) | --force cache 0 + 19/19 PASS |
| **P-h** | dual_ai_reviews hook 자동 INSERT ≥ 1건 (60 sprint streak 도전) | sprint-396 row 1건+ |

> **autopilot reports hallucination 회피 강제 (S360 19회차 변종 학습 적용)**:
> - reports/sprint-396-*.md 신규 2건+ **실파일 생성 의무화** (PR body 수치만 첨부 금지)
> - msa-lint PASS 사전 확증 (PR open 직전 `pnpm turbo run lint --force` 실행)
> - velocity sprint-396.json `f_items: ["F662"]` 정확 + `duration_minutes` 정확 기재

## §8 위험 + 대응

| 위험 | 확률 | 영향 | 대응 |
|------|-----|------|------|
| autopilot이 기존 baseline 인식 실패 + 중복 구현 | 낮음 | 중 | Plan §1 "F632 baseline 활용" 명시 + SCOPE LOCKED prompt에 "기존 cq-evaluator.service.ts 확장만, 신규 클래스 생성 금지" 강제 |
| SQLite ALTER COLUMN 미지원 → 재테이블 마이그레이션 시도 | 중 | 중 | Plan §3 (a) "ALTER ADD COLUMN만 사용, question_id 변경 금지, synthetic cq_question 자동 등록 패턴 사용" 명시 |
| <90 분류 휴리스틱 정확도 미흡 | 중 | 낮음 | F662 MVP 임시정의 + 향후 별도 분류 prompt 추가 가능 (deferred) |
| autopilot CPU 50ms timeout (Workers 제약) | 낮음 | 중 | waitUntil fire-and-forget 패턴 적용 (autoTriggerMetaAgent 동일) |
| Production smoke 14회차 변종 재현 | 낮음 | 중 | Plan §5 "reports/sprint-396-*.md 신규 2건+ 의무화" + msa-lint 사전 검증 강제 |

## §9 다음 사이클 후보 (out-of-scope)

- F663 Sprint 397 — 80-20-80 HITL 5-state 머신 + hitl_queue D1
- F664 Sprint 398 — HITL Console UI
- F665 Sprint 398+ — CQ 작성 가이드 + AI 금지 강제
- F647 sidebar Portal race (S361 다음 사이클 후보)
- F645 silent layer 7 fix (S361 다음 사이클 후보)
- W20 KPI 6/8 베이스라인 측정
- Cloudflare KV 점수 캐싱 PoC (PRD §11, DeepSeek R1 권고)

## §10 메타 학습

- **Plan fs 실측 의무화 26회차 정착화** — F662 row PRD 가정 vs 실 fs drift 즉시 발견 (마이그레이션 0165 → 실제 0155 / "신규 schema" → F632 이미 구축). rules/development-workflow.md "Sprint 사전 등록 + Plan 작성 fs 실측 의무화" S283 패턴 26회차 적용.
- **사전 구축 인지 → scope 재정의 → 빠른 closure** — gap fill 패턴은 S280 F435 / S282 F437 / 본 S362 F662 = 3회차. 진정한 작업 식별로 60~90분 예상 → 20~30분 단축.
- **autopilot 의식적 사전 prompt 인지 강제** — "기존 baseline 활용, 신규 클래스 생성 금지" 명시로 표면 충족 함정 회피 (S280/S282 패턴 27회차).
