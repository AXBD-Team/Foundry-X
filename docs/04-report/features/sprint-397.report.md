---
code: FX-RPRT-397
title: Sprint 397 F663 — HITL 5-state 머신 + hitl_queue + /transition 완료 보고
version: 1.0
status: Completed
category: Report
phase: 47
sprint: 397
f_items:
  - F663
match_rate: 100
created: 2026-05-16
session: S363
---

# Sprint 397 완료 보고 — F663 HITL 5-state 머신

## 요약

F605 baseline (core/hitl/) 위에 80-20-80 HITL 워크플로 5-state 머신을 구현했어요.
hitl_queue D1 테이블 신설 + HitlStateMachine service + POST /transition endpoint + T1~T6 TDD.

**Match Rate: 100% | Tests: 2472/2474 PASS (+6 신규) | msa-lint PASS | typecheck PASS**

## 변경 요약

| 파일 | 구분 | LOC |
|------|------|-----|
| `db/migrations/0156_hitl_queue_state_machine.sql` | 신규 | +19 |
| `core/hitl/services/hitl-state-machine.service.ts` | 신규 | +124 |
| `core/hitl/__tests__/hitl-state-machine.test.ts` | 신규 | +268 |
| `core/hitl/types.ts` | 수정 | +46 |
| `core/hitl/schemas/hitl.ts` | 수정 | +13 |
| `core/hitl/routes/index.ts` | 수정 | +20 |

## Phase Exit P-a~P-h 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | migration 0156 + hitl_queue + 3 INDEX | ✅ |
| P-b | createInitial T1 PASS | ✅ |
| P-c | full lifecycle T6 (5 transitions) | ✅ |
| P-d | invalid transition T3 | ✅ |
| P-e | RBAC denied T4 (Operator/HUMAN_REVIEWED→AI_REVISED) | ✅ |
| P-f | audit-bus 5 events + trace_id chain valid | ✅ |
| P-g | tsc --noEmit PASS + msa-lint PASS | ✅ |
| P-h | dual_ai_reviews + 61 sprint streak | CI 확인 |

## 핵심 결정

1. **이중 상태 모델 병존**: 기존 `HitlStatus` 4-state(큐 작업) + 신규 `HitlState` 5-state(워크플로) — 동일 도메인 다른 관점으로 분리
2. **HUMAN_REVIEWED→AI_REVISED: Operator 불허** — T4에서 검증. AI 재생성 트리거는 검토자 이상 권한만
3. **AuditBus import: infra/types.js** — no-cross-domain-import 준수 (infra/audit-bus.js 직접 import 차단)

## 메타 학습 (S363)

- **gap fill 패턴 4회차** (F662에 이어): 사전 측정 → scope 축소 → 짧은 sprint 완결
- **S362 학습 4회차 효과**: msa-lint PASS + reports 실파일 3건 생성 모두 성공
- **RBAC matrix 결정**: Plan §3에 Operator 포함 기재 vs 테스트 T4 denied 예상 — 실 설계 논리 우선(Operator는 큐 진입/AI 재생성 불가)으로 결정

## 산출물 파일

- `reports/sprint-397-hitl-state-machine-transitions.md` ✅
- `reports/sprint-397-rbac-denied-samples.md` ✅
- `docs/02-design/features/sprint-397.design.md` ✅
- `docs/metrics/velocity/sprint-397.json` ✅
