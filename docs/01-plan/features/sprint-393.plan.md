---
code: FX-PLAN-393
title: Sprint 393 — F621 KPI 통합 화면 (4 본부 동시 운영 metric collector + 한 화면 시각화)
version: 1.0
status: Active
category: PLAN
sprint: 393
feature: F621
req: FX-REQ-686
priority: P3
session: S357
date: 2026-05-12
related:
  - SPEC.md §5 F621
  - docs/specs/ai-foundry-os/sprint-plan.md §1.2 P1
  - docs/specs/FX-SPEC-PRD-V8_foundry-x.md §4.1 #5
  - docs/specs/ai-foundry-master-plan/17_internal_dev_plan_with_besir_v1.md §3 Tier 6
  - docs/02-design/features/sprint-377.design.md (F604 KPI baseline)
  - docs/02-design/features/sprint-378.design.md (F605 HITL baseline)
---

# Sprint 393 — F621 KPI 통합 화면 (4 본부 동시 운영)

## 1. Sprint 컨텍스트

**위상**: 5/14 BeSir D-2 dry-run 2차 산출물. F619 ✅ (Sprint 392 S357) 직후 연속 sprint. W19 BeSir 미팅(5/15) 운영 시연 자료.

**의존성 모두 ✅**:
- F604 KPI 위젯 4종 + 8 KPI 산정 (Sprint 377 ✅, S348) — `core/kpi/` sub-app + KpiTile/MetricGrid/Sparkline/TrendArrow
- F605 HITL Console (Sprint 378 ✅, S349) — `core/hitl/` sub-app + HitlDecisionForm/HitlEscalationBadge/HitlMetricsTile/HitlQueueTable
- F606 Audit Log Bus (Sprint 351 ✅ + S337 hardening) — trace_id chain baseline

**본 sprint = 통합 화면만**:
SPEC §5 F621 본문 인용: "F604(KPI 위젯 4종) 후속 — 4 본부 동시 운영 metric collector + 한 화면 시각화. F604 위젯 + F605 HITL Console과 함께 운영 페이지 구성. **MVP 게이트 (W27)**."

17 plan §3 Tier 6 F621 unlock 조건: "F604 + F605 unlock 후" → 둘 다 ✅이므로 진행 가능.

**연속 streak**: 56 sprint 연속 (S306~S357 + F619 ✅) — 본 sprint = 57 sprint streak 도전.

## 2. 목표 (SCOPE LOCKED)

### in-scope (5 항목)

1. **routes/operations.tsx 신규** (또는 routes/kpi-dashboard.tsx)
   - 파일: `packages/web/src/routes/operations.tsx` (신설)
   - Path: `/operations` (또는 `/kpi-dashboard`)
   - 4 본부 column grid layout (KOAMI / AXIS-DS / Decode-X / Foundry-X 또는 demo mock 4 본부)
   - 본부 selector (전체 / 단일 본부 / 4 본부 동시)
   - 갱신 주기 표시 (마지막 fetch 시각 + 자동 refresh 옵션)

2. **components/operations/** 신규 디렉토리
   - 파일: `packages/web/src/components/operations/OrgKpiPanel.tsx` (신설)
   - 파일: `packages/web/src/components/operations/OrgHitlPanel.tsx` (신설)
   - 파일: `packages/web/src/components/operations/OrgSelector.tsx` (신설)
   - 파일: `packages/web/src/components/operations/index.ts` (re-export)
   - 파일: `packages/web/src/components/operations/types.ts` (OrgUnit + KpiSummary types)
   - F604 위젯 (KpiTile + MetricGrid + Sparkline + TrendArrow) 재사용
   - F605 위젯 (HitlMetricsTile + HitlEscalationBadge) 재사용

3. **KPI endpoint 본부 필터** (F604 baseline 활용)
   - 옵션 A: `core/kpi/routes/` 기존 endpoint에 `?org=<orgId>` query param 추가 (backward compat 유지)
   - 옵션 B: frontend filtering only (server는 전체 응답, client가 orgId로 분류)
   - **결정**: 옵션 B (서버 변경 0, frontend filtering — F604 회귀 위험 0, 빠른 진행, demo 4 본부 mock 가능)

4. **router 등록** (dashboard.tsx 또는 root router)
   - 파일: `packages/web/src/router.tsx` 또는 `routes/dashboard.tsx` (수정)
   - `/operations` 라우트 등록 + ProtectedRoute 통과

5. **E2E test 1건** + unit test 2건
   - 파일: `packages/web/e2e/operations.spec.ts` (신설) — 페이지 렌더 + 본부 selector + 4 본부 KPI 표시
   - 파일: `packages/web/src/components/operations/__tests__/OrgKpiPanel.test.tsx` (신설)
   - 파일: `packages/web/src/components/operations/__tests__/OrgHitlPanel.test.tsx` (신설)

### out-of-scope (6 항목, 다음 사이클)

- **F601 본부별 RBAC 5역** (Admin/Reviewer/Approver/Operator/Auditor) — 외부 PG + SSO 결정 의존
- **F600 5-Layer 통합 PoC** (외부 4 repo orchestration)
- **F622 운영·QA·교육 패키지** (W28~W29 deferred)
- **KPI 위젯/HITL 위젯 자체 변경** (F604/F605 baseline 유지)
- **본부 schema 신설** (org_id 컬럼은 demo 모드 mock 또는 기존 sessions/proposals에서 추출)
- **F657 shard 1 race** (P2, 운영 영향 0)

### DoD (Definition of Done)

- `pnpm typecheck` + `pnpm lint` PASS (turbo cache 우회 1회 — `pnpm exec tsc --noEmit`)
- 신규 test 3건 PASS (E2E 1 + unit 2)
- ESLint cross-domain 0건 (kpi ↔ hitl ↔ operations 모두 web layer, backend 변경 0)
- PR + auto-merge (CI 4 shard GREEN)
- master push CI 4 shard GREEN (e2e shard 1 race 미관여 — 신규 spec, 기존 spec drift 없음)

## 3. 변경 파일

### 신설 (7 파일)

| 파일 | 용도 |
|------|------|
| `packages/web/src/routes/operations.tsx` | `/operations` 페이지 (4 본부 column grid) |
| `packages/web/src/components/operations/OrgKpiPanel.tsx` | 본부별 KPI 패널 (F604 위젯 재사용) |
| `packages/web/src/components/operations/OrgHitlPanel.tsx` | 본부별 HITL 패널 (F605 위젯 재사용) |
| `packages/web/src/components/operations/OrgSelector.tsx` | 본부 selector (전체/단일/4 동시) |
| `packages/web/src/components/operations/index.ts` | re-export contract |
| `packages/web/src/components/operations/types.ts` | OrgUnit + KpiSummary + HitlSummary types |
| `packages/web/e2e/operations.spec.ts` | E2E 페이지 렌더 + 본부 selector + 4 본부 KPI |

### 수정 (1~2 파일)

| 파일 | 변경 |
|------|------|
| `packages/web/src/router.tsx` 또는 `routes/dashboard.tsx` | `/operations` 라우트 등록 + lazy import |

### 변경 없음 (회귀 0 baseline)

- `core/kpi/`, `core/hitl/`, `core/agent/` 등 backend — 0 수정 (F604/F605 baseline 유지)
- D1 migration — 0 (mock 4 본부 orgId, schema 변경 없음)
- F619 신규 multi-evidence + decode-bridge — 0 수정 (회귀 0)

## 4. Phase Exit (Smoke Reality 12항)

| # | 항목 | 판정 |
|---|------|------|
| P-a | `routes/operations.tsx` 신설 + `/operations` 라우트 등록 | 파일 존재 + router mount + ProtectedRoute 통과 |
| P-b | OrgKpiPanel + OrgHitlPanel + OrgSelector + types contract | 4 파일 신설 + re-export OK |
| P-c | F604 4 위젯 재사용 (KpiTile + MetricGrid + Sparkline + TrendArrow) | OrgKpiPanel import 검증 |
| P-d | F605 위젯 재사용 (HitlMetricsTile + HitlEscalationBadge) | OrgHitlPanel import 검증 |
| P-e | 4 본부 column grid 시각화 | E2E test `getByText('KOAMI'/'AXIS-DS'/'Decode-X'/'Foundry-X')` PASS |
| P-f | 본부 selector 동작 | OrgSelector unit test PASS + E2E 전체/단일 switch 검증 |
| P-g | typecheck + lint PASS (turbo cache 우회 1회) | `pnpm exec tsc --noEmit` PASS + `pnpm lint` 0 errors |
| P-h | ESLint cross-domain 0건 (frontend layer 만, backend 변경 0) | `foundry-x-api/no-cross-domain-import` N/A (web 영역) |
| P-i | dual_ai_reviews sprint 393 자동 INSERT ≥ 1건 | hook 57 sprint 연속 |
| P-j | Match ≥ 90% (semantic 100% 목표) | gap analysis report |
| P-k | F619 + Tier 1~5 17건 회귀 0 | api 3000+ tests 통과 + web 신규 spec PASS |
| P-l | master push CI 4 shard GREEN | F644 패턴 회피 — 신규 spec, 기존 spec drift 없음 |

## 5. 위험 + PR FAIL 대응

| 위험 | 대응 |
|------|------|
| 4 본부 데이터 mock 정의 | demo orgUnits = ['KOAMI', 'AXIS-DS', 'Decode-X', 'Foundry-X'] hardcoded, KPI/HITL 데이터는 기존 endpoint 응답을 orgId로 client filter |
| F604 KPI endpoint 본부 필터 부재 | 옵션 B 채택 — server 변경 0, frontend filter (회귀 위험 0) |
| F605 HITL endpoint 본부 필터 부재 | 동일 — frontend filter (queue API 응답에 orgId 있으면 분류) |
| ProtectedRoute auth fixture (e2e 환경) | F649 webServer array baseline (Sprint 384 ✅) + authenticatedPage fixture 재사용 |
| router lazy import + ProtectedRoute | dashboard.tsx 패턴 그대로 (F604/F605 web 컴포넌트 동일 패턴) |
| turbo cache 함정 | `pnpm exec tsc --noEmit` 직접 실행 1회 |
| master push CI 회귀 (F644 패턴) | 신규 spec 1건 + 기존 spec 변경 0건 → shard 1 race 미관여 |

## 6. 예상 시간

**~30~45분 autopilot** (web 페이지 + 3 컴포넌트 + 본부 selector + E2E 1건 + unit 2건 + master push CI 대기).

## 7. BeSir 미팅 시연 가치

- Foundry-X **4 본부 동시 운영 통합 화면 ✅** 시연 가능
- KPI 위젯 4종 + HITL 통합 표시 → 운영 관점 시각화 완비
- **MVP W27 게이트 충족** (F621 마감)
- 본부별 RBAC(F601 외부 의존)는 demo orgUnits mock으로 unblock 처리 (실 RBAC은 외부 unlock 시 swap)
- 5/15 BeSir 미팅에 "Tier 1~5 17건 ✅ + F619 stub ✅ + F621 통합 화면 ✅ = 19건 + MVP W27" 보고

## 8. 다음 사이클 후보 (out of scope)

- **F625 CQ 5축 운영 검증**: F582 + F632 baseline, Closure 단위 5축 검증
- **F600 5-Layer 통합 PoC**: 외부 4 repo orchestration 골격 (외부 의존 분리)
- **F601 Multi-Tenant PG + RBAC + SSO**: 외부 PG + SSO 결정 unlock 후
- **F619 실 이벤트 hook 20%**: Decode-X Phase 2-E unlock 시 stub swap
- **F657 shard 1 race 정밀 fix**: P2, 운영 영향 0
- **5/15 BeSir 미팅 자료 정리**: 17 plan v2 업데이트 + unlock 요청 4건

---

**SCOPE LOCKED 확인용 키워드**:
- routes/operations.tsx 신규 (`/operations`)
- OrgKpiPanel + OrgHitlPanel + OrgSelector 3 신규 컴포넌트
- types.ts + index.ts contract
- E2E 1건 + unit 2건 = 신규 test 3건
- F604 위젯 4종 재사용 + F605 위젯 2종 재사용
- backend 변경 0 (frontend filtering 옵션 B)
- 신설 7 파일 + 수정 1~2 파일
- in-scope 5 + out-of-scope 6
- Phase Exit P-a~P-l 12항
- 예상 ~30~45분 autopilot
- 5/14 BeSir D-2 buffer ~50h (D-day 충분)
