---
code: FX-DSGN-393
title: Sprint 393 — F621 KPI 통합 화면 설계 (4 본부 동시 운영)
version: 1.0
status: Active
category: DESIGN
sprint: 393
feature: F621
req: FX-REQ-686
session: S357
date: 2026-05-12
related:
  - docs/01-plan/features/sprint-393.plan.md
  - docs/02-design/features/sprint-377.design.md (F604 KPI baseline)
  - docs/02-design/features/sprint-378.design.md (F605 HITL baseline)
---

# Sprint 393 — F621 KPI 통합 화면 설계

## 1. 설계 원칙

- **옵션 B (frontend filtering)**: backend 변경 0, F604/F605 baseline 유지
- **demo 4 본부 hardcoded**: KOAMI / AXIS-DS / Decode-X / Foundry-X (F601 unlock 시 swap)
- **F604/F605 위젯 재사용**: KpiTile + MetricGrid + Sparkline + TrendArrow + HitlMetricsTile + HitlEscalationBadge

## 2. 컴포넌트 아키텍처

```
routes/operations.tsx               ← /operations 페이지 진입점
  └─ OrgSelector                   ← 본부 selector (전체/단일/동시)
  └─ [orgUnit] grid column
       └─ OrgKpiPanel              ← 본부별 KPI 패널 (F604 위젯 재사용)
            └─ MetricGrid          ← KpiTile × N
            └─ Sparkline           ← 추세선
            └─ TrendArrow          ← 방향 화살표
       └─ OrgHitlPanel             ← 본부별 HITL 패널 (F605 위젯 재사용)
            └─ HitlMetricsTile     ← HITL 메트릭 타일
            └─ HitlEscalationBadge ← 에스컬레이션 배지
```

## 3. 데이터 흐름 (옵션 B — frontend filtering)

```
GET /api/kpi                 ← F604 그대로 (backend 변경 0)
  → KpiListResponse{ kpis[] }
  → client: kpis 전체를 orgUnit에 따라 시각적 분류 (실 필터 없음 — mock orgUnit 연결)

GET /api/hitl/queue          ← F605 그대로 (backend 변경 0)
  → HitlQueueResponse{ items[orgId?] }
  → client: items.filter(item => item.orgId === orgUnit.id || !item.orgId)
```

**demo 4 본부 mock orgUnits** (F601 unlock 전 hardcoded):
```typescript
const ORG_UNITS: OrgUnit[] = [
  { id: 'KOAMI',     label: 'KOAMI',     color: '#6366f1' },
  { id: 'AXIS-DS',   label: 'AXIS-DS',   color: '#f59e0b' },
  { id: 'Decode-X',  label: 'Decode-X',  color: '#10b981' },
  { id: 'Foundry-X', label: 'Foundry-X', color: '#ec4899' },
];
```

## 4. 테스트 계약 (TDD Red Target)

### E2E: packages/web/e2e/operations.spec.ts

| # | 시나리오 | assertion |
|---|---------|-----------|
| E1 | `/operations` 페이지 렌더 | `<h1>운영 통합 대시보드</h1>` 표시 |
| E2 | 4 본부 column 모두 표시 | `getByText('KOAMI')`, `getByText('AXIS-DS')`, `getByText('Decode-X')`, `getByText('Foundry-X')` 모두 visible |
| E3 | selector — 단일 본부 선택 시 해당 본부만 표시 | `KOAMI` 선택 → `AXIS-DS` hidden or absent |

### Unit: OrgKpiPanel.test.tsx

| # | 시나리오 | assertion |
|---|---------|-----------|
| U1 | orgUnit과 kpis를 받아 MetricGrid 렌더 | kpi label 텍스트 표시 |
| U2 | loading 상태 표시 | spinner 또는 skeleton 표시 |

### Unit: OrgHitlPanel.test.tsx

| # | 시나리오 | assertion |
|---|---------|-----------|
| U3 | orgUnit과 metrics를 받아 HitlMetricsTile 렌더 | "대기 중" label 표시 |
| U4 | escalated > 0 시 HitlEscalationBadge 표시 | badge visible |

## 5. 파일 매핑

| 파일 | 유형 | 설명 |
|------|------|------|
| `packages/web/src/components/operations/types.ts` | 신설 | OrgUnit, KpiSummary, HitlSummary types |
| `packages/web/src/components/operations/OrgSelector.tsx` | 신설 | 본부 selector UI |
| `packages/web/src/components/operations/OrgKpiPanel.tsx` | 신설 | 본부별 KPI 패널 |
| `packages/web/src/components/operations/OrgHitlPanel.tsx` | 신설 | 본부별 HITL 패널 |
| `packages/web/src/components/operations/index.ts` | 신설 | re-export |
| `packages/web/src/routes/operations.tsx` | 신설 | `/operations` 페이지 |
| `packages/web/e2e/operations.spec.ts` | 신설 | E2E 3 scenarios |
| `packages/web/src/components/operations/__tests__/OrgKpiPanel.test.tsx` | 신설 | unit 2건 |
| `packages/web/src/components/operations/__tests__/OrgHitlPanel.test.tsx` | 신설 | unit 2건 |
| `packages/web/src/router.tsx` | 수정 | `/operations` 라우트 등록 |

## 6. Stage 3 Exit 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 — router.tsx 1곳만 수정 | ✅ |
| D2 | 식별자 계약 — OrgUnit.id = string (KOAMI/AXIS-DS/Decode-X/Foundry-X) | ✅ |
| D3 | Breaking change 영향도 — backend 변경 0, F604/F605 baseline 0 수정 | ✅ |
| D4 | TDD Red 파일 — 테스트 먼저 작성 후 구현 | ✅ |
