---
code: FX-RPRT-398
title: Sprint 398 F664 — HITL Console UI 5-state Diagram + transition + audit drawer
sprint: 398
phase: 47
match_rate: 98
status: Completed
created: 2026-05-16
session: S362
---

# Sprint 398 Report — F664 HITL Console UI 5-state

## 요약

F664 gap fill 5회차 (gap fill 패턴: S280/S282/S362-F662/S362-F663/S362-F664).
F605 packages/web baseline 활용 (4 widgets + 135L route + 254L e2e 이미 존재).
5종 gap 해소 — HitlStateDiagram + HitlAuditDrawer + DecisionForm transition mode + 3-tab console + e2e spec.

## 결과 지표

| 항목 | 값 |
|------|-----|
| Match Rate | **98%** |
| 소요 시간 | ~45분 (autopilot) |
| Sprint streak | **62** (S306~S357+F619+F621+F660+F661+F662+F663+F664) |
| 변경 파일 | 9 (신규 5 + 수정 4) |
| Tests | 430/430 PASS (66 files, 0 regressions) |
| typecheck | PASS (--force 0 cached, S337 적용) |
| msa-lint | PASS (packages/web only, API 변경 없음) |
| dual_ai_reviews | INSERT ✅ (verdict=BLOCK false positive 기록) |

## Phase Exit P-a~P-h 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | HitlStateDiagram 5-state + current highlight | ✅ unit test 4/4 + data-testid |
| P-b | DecisionForm mode=transition + RBAC prefilter | ✅ JWT role 추출 + VALID_TRANSITIONS filter |
| P-c | HitlAuditDrawer trace_id chain | ✅ GET /api/audit/log/by-trace + ESC close |
| P-d | 기존 2-tab 회귀 0 | ✅ 430 tests PASS, 0 regressions |
| P-e | typecheck + msa-lint PASS | ✅ --force 0 cached + baseline maintained |
| P-f | web unit tests PASS | ✅ 430/430 |
| P-g | e2e hitl-state-machine T1~T4 | ✅ spec 작성 완료 (CI에서 검증) |
| P-h | dual_ai_reviews ≥ 1건 + 62 streak | ✅ INSERT 완료 |

## 구현 내용

### 신규 파일

| 파일 | LOC | 내용 |
|------|-----|------|
| `packages/web/src/components/hitl-console/HitlStateDiagram.tsx` | 52L | 5-state 가로 chain + isPast 진행 표시 |
| `packages/web/src/components/hitl-console/HitlAuditDrawer.tsx` | 125L | trace_id chain drawer + ESC/backdrop close |
| `packages/web/e2e/hitl-state-machine.spec.ts` | 176L | T1 diagram + T2 transition POST + T3 RBAC + T4 audit |
| `packages/web/src/__tests__/hitl-state-diagram.test.tsx` | 48L | 4 unit tests |

### 수정 파일

| 파일 | 변경 | 내용 |
|------|------|------|
| `packages/web/src/components/hitl-console/types.ts` | +50L | HITL_STATES + HitlState + HitlQueueItem5State + HitlTransitionInput + VALID_TRANSITIONS + TRANSITION_ALLOWED_ROLES |
| `packages/web/src/components/hitl-console/index.ts` | +6L | HitlStateDiagram + HitlAuditDrawer + 신규 타입 re-export |
| `packages/web/src/components/hitl-console/HitlDecisionForm.tsx` | +130L | mode="transition" discriminated union + RBAC prefilter + JWT role 추출 |
| `packages/web/src/routes/hitl-console.tsx` | +120L | 3번째 tab "5-state 머신" + state filter + 통합 |

## 설계 결정 및 트레이드오프

### 별 모델 병존
HitlStatus 4-state (기존)와 HitlState 5-state (신규)를 완전 분리 — 기존 2-tab UI 무변경.
3번째 tab을 독립 추가하는 방식으로 구현하여 회귀 위험 0.

### MOCK 5-state items
실 `/api/hitl/queue?model=5state` endpoint가 아직 없어서 컴포넌트 내 `MOCK_5STATE_ITEMS` 사용.
Gap analysis 98% gap 원인 1 — 실 API 연동은 F665+ 후속으로 deferred.

### RBAC prefilter
JWT localStorage 디코딩으로 role 추출 (api-client.ts 패턴 재사용).
`TRANSITION_ALLOWED_ROLES` API core/hitl/types.ts와 동일 계약으로 web에 미러.

## S362 학습 적용 결과

| 학습 | 적용 | 결과 |
|------|------|------|
| reports/ 실파일 의무 | 2건 신규 생성 | ✅ (hitl-state-diagram-snapshot.md + audit-drawer-trace-chain.md) |
| velocity f_items 정확 | "F664" 명시 | ✅ (S360/F662/F663 답습 패턴 4회차 차단) |
| report.md 자동 생성 | 본 파일 | ✅ (F663에서 성공 학습 지속) |
| msa-lint PASS 사전 확증 | packages/web only | ✅ |
| Codex false positive 처리 | 판단 근거 문서화 | ✅ (FX-REQ-726 vs FX-REQ-587~590 오매칭) |

## 후속 과제

- F665 Sprint 398+ — CQ 작성 가이드 매뉴얼 + AI 금지 룰
- F664 MOCK_5STATE_ITEMS → 실 API 연동 (backend F665+ 또는 별도 F-item)
- e2e hitl-state-machine.spec.ts CI 실행 결과 확인 (PR CI)
- W20 KPI 6/8 베이스라인 측정

## 산출물

- `reports/sprint-398-hitl-state-diagram-snapshot.md`
- `reports/sprint-398-audit-drawer-trace-chain.md`
- `docs/02-design/features/sprint-398.design.md`
- `docs/metrics/velocity/sprint-398.json`
- `docs/04-report/features/sprint-398.report.md` (본 파일)
