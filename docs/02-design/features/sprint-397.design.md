---
code: FX-DSGN-397
title: F663 HITL 5-state 머신 + hitl_queue + /transition — 상세 설계
version: 1.0
status: Active
category: Design
phase: 47
sprint: 397
f_items:
  - F663
req:
  - FX-REQ-725
created: 2026-05-16
session: S363
---

# Sprint 397 Design — F663 HITL 5-state 머신

## §1 개요

F605 baseline (core/hitl/ 5 files) 위에 80-20-80 HITL 워크플로 5-state 머신을 추가한다.

**핵심 결정**: 기존 `HitlStatus` 4-state(큐 작업 상태)와 신규 `HitlState` 5-state(워크플로 단계)는 병존 — 동일 도메인의 다른 관점이므로 별 타입으로 분리.

## §2 5-state 머신 상태도

```
AI_GENERATED ──[Reviewer/Operator/Admin]──► REVIEW_QUEUED
                                                │
                               [Reviewer/Approver/Admin]
                                                │
                                                ▼
                                        HUMAN_REVIEWED
                                                │
                               [Reviewer/Admin] (Operator 불허)
                                                │
                                                ▼
                                           AI_REVISED
                                                │
                              [Approver/Admin]
                                                │
                                                ▼
                                       FINAL_APPROVED (종단)
```

## §3 RBAC Transition Matrix

| Transition | 허용 역할 | 비고 |
|------------|-----------|------|
| AI_GENERATED → REVIEW_QUEUED | Admin, Reviewer, Operator | 큐 진입 |
| REVIEW_QUEUED → HUMAN_REVIEWED | Admin, Reviewer, Approver | 검수 시작 |
| HUMAN_REVIEWED → AI_REVISED | Admin, Reviewer | Operator 불허 — AI 재생성 트리거는 검토자 이상 |
| AI_REVISED → FINAL_APPROVED | Admin, Approver | 최종 승인 |

## §4 D1 Schema

```sql
CREATE TABLE IF NOT EXISTS hitl_queue (
  id TEXT PRIMARY KEY,
  graph_session_id TEXT,       -- F662 cq_evaluation 연결 (nullable)
  cq_evaluation_id TEXT,       -- CQ 평가 결과 연결 (nullable)
  org_id TEXT NOT NULL,
  state TEXT NOT NULL,
  reviewer_id TEXT,
  payload TEXT,
  audit_trace_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  transitioned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (state IN ('AI_GENERATED','REVIEW_QUEUED','HUMAN_REVIEWED','AI_REVISED','FINAL_APPROVED'))
);
```

인덱스: `(org_id, state)` / `graph_session_id` / `audit_trace_id`

## §5 파일 매핑

### 신규 파일

| 파일 | 내용 | LOC |
|------|------|-----|
| `packages/api/src/db/migrations/0156_hitl_queue_state_machine.sql` | hitl_queue 테이블 + 3 INDEX | ~20 |
| `packages/api/src/core/hitl/services/hitl-state-machine.service.ts` | HitlStateMachine class (createInitial + transition) | ~100 |
| `packages/api/src/core/hitl/__tests__/hitl-state-machine.test.ts` | T1~T6 integration tests | ~200 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/hitl/types.ts` | HITL_STATES const + HitlState type + VALID_TRANSITIONS + TRANSITION_ALLOWED_ROLES + HitlTransitionInput + HitlTransitionResult interface |
| `packages/api/src/core/hitl/schemas/hitl.ts` | HitlTransitionSchema (queueItemId UUID + fromState + toState + role + reviewerId?) |
| `packages/api/src/core/hitl/routes/index.ts` | POST /transition endpoint (HitlStateMachine 호출) |

## §6 Audit Trail

createInitial → `hitl.state.created` (새 traceId 생성)
각 transition → `hitl.state.<state.toLowerCase()>` (기존 traceId 전파)

Full lifecycle 6 audit events: created + review_queued + human_reviewed + ai_revised + final_approved

## §7 TDD 결과

| 테스트 | 상태 |
|--------|------|
| T1: createInitial → AI_GENERATED INSERT + emit | ✅ PASS |
| T2: AI_GENERATED → REVIEW_QUEUED (Reviewer) | ✅ PASS |
| T3: invalid transition (AI_GENERATED → FINAL_APPROVED) | ✅ PASS |
| T4: RBAC denied (Operator, HUMAN_REVIEWED → AI_REVISED) | ✅ PASS |
| T5: state mismatch | ✅ PASS |
| T6: full lifecycle 5 transitions + trace_id chain | ✅ PASS |

## §8 Phase Exit 충족 여부

| # | 항목 | 상태 |
|---|------|------|
| P-a | migration 0156 + hitl_queue + 3 INDEX | ✅ |
| P-b | createInitial T1 PASS | ✅ |
| P-c | full lifecycle T6 | ✅ |
| P-d | invalid transition T3 | ✅ |
| P-e | RBAC denied T4 | ✅ |
| P-f | audit-bus 5 events T6 + trace_id chain | ✅ |
| P-g | tsc --noEmit PASS + msa-lint PASS | ✅ |
| P-h | dual_ai_reviews + 61 streak | CI 확인 대기 |
