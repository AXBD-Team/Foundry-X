---
code: FX-DSGN-396
title: F662 CQ 5축 graph_session hook 연결 — 상세 설계
version: 1.0
status: Active
category: Design
phase: 47
sprint: 396
f_items:
  - F662
req:
  - FX-REQ-724
created: 2026-05-16
session: S362
---

# Sprint 396 Design — F662 CQ graph_session hook 연결

## §1 범위 (Gap Fill)

F632 era baseline 위에 5개 gap을 채움:
- (a) D1 migration: `graph_session_id` + `failure_reason` 컬럼 추가
- (b) `discovery-stage-runner.ts`: `autoTriggerCQEvaluator` 추가 + run-all hook 연결
- (c) `CQEvaluator.evaluate()`: `graphSessionId` 파라미터 + failure_reason 분류
- (d) `types.ts`: `FailureReason` 타입 + `CQEvaluationResult` 확장
- (e) Integration test: T4~T7 (graph_session_id INSERT + failure_reason 2 케이스)

## §2 데이터 모델

### D1 cq_evaluations (after 0155 migration)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | TEXT PK | UUID |
| org_id | TEXT | |
| question_id | TEXT | synthetic: `auto-cq-{graphSessionId}` |
| axis_scores | TEXT | JSON |
| total_score | INTEGER | 0~100 |
| handoff_decision | TEXT | handoff / human_review |
| evaluated_at | INTEGER | epoch ms |
| graph_session_id | TEXT NULL | F662 신규 |
| failure_reason | TEXT NULL | F662 신규 (human_error / infra_issue) |

## §3 failure_reason 분류 로직

```
parseAxisScores(llmResponse.content) → null?
  YES (LLM 응답 파싱 실패) → usedDefault=true
    totalScore < 90 → failureReason = "infra_issue"
  NO (파싱 성공) → usedDefault=false
    totalScore < 90 → failureReason = "human_error"
    totalScore >= 90 → failureReason = null
```

## §4 autoTriggerCQEvaluator 흐름

```
graph-session run-all 완료
  → sessionService.updateStatus("completed")
  → metaTask = autoTriggerMetaAgent(...)
  → cqTask   = autoTriggerCQEvaluator(db, sessionId, orgId, apiKey, result)
  → waitUntil(Promise.all([metaTask, cqTask]))

autoTriggerCQEvaluator 내부:
  → AuditBus(db, default-hmac-key)
  → LLMService(undefined, apiKey)  -- anthropic REST fallback
  → CQEvaluator.evaluate({
       orgId, questionId="auto-cq-{graphSessionId}",
       llmCallContext={sessionId=graphSessionId, response=JSON.stringify(result).slice(0,4000)},
       graphSessionId
     })
  → INSERT cq_evaluations.graph_session_id = graphSessionId
```

## §5 파일 매핑

| 파일 | 변경 유형 | 비고 |
|------|----------|------|
| `packages/api/src/db/migrations/0155_cq_evaluations_graph_session.sql` | 신규 | ALTER + INDEX |
| `packages/api/src/core/cq/types.ts` | 수정 | FailureReason + CQEvaluationResult 확장 |
| `packages/api/src/core/cq/services/cq-evaluator.service.ts` | 수정 | evaluate() 확장 |
| `packages/api/src/core/cq/services/review-cycle.service.ts` | 수정 | lint fix (pre-existing) |
| `packages/api/src/core/cq/cq-graph-hook.test.ts` | 신규 | T4~T7 |
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | 수정 | autoTriggerCQEvaluator + hook |

## §6 Out-of-scope

- F663 HITL 5-state 머신 / hitl_queue
- F664 HITL Console UI
- F665 CQ 작성 가이드
- 5축 정확도 정밀화 (MVP 임시정의 유지)
- KV 캐싱, 별 평가 Worker
