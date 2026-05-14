---
code: FX-DSGN-395
title: Sprint 395 — F661 api_p99 schema + agent별 threshold 분리 + endpoint latency dashboard
version: 1.0
status: Implemented
category: DESIGN
sprint: 395
feature: F661
req: FX-REQ-723
session: S360
date: 2026-05-14
related:
  - docs/01-plan/features/sprint-395.plan.md
  - packages/api/src/core/kpi/
  - packages/web/src/components/operations/
---

# Sprint 395 — F661 설계 문서

## 1. 설계 목표

Plan §2.1 4 part 그대로 구현:
- (a) api_p99 KPI 신규 추가
- (b) api_p95 threshold 현실화 (LLM-aware)
- (c) cheatsheet docs 갱신
- (d) agent별 latency dashboard (D1 migration 0, agent_id 활용)

---

## 2. 아키텍처 결정

### 2.1 (a) api_p99 설계

**KPI_IDS enum 확장** (`core/kpi/types.ts`)
- `"api_p99"` 추가 (api_p95 다음 순서)
- TypeScript `as const` 배열이라 Zod schema(`KpiIdSchema = z.enum(KPI_IDS)`)가 자동 갱신됨
- frontend `packages/web/src/components/kpi/types.ts` KpiId union에도 추가

**calculateApiP99()** (`kpi-calculator.service.ts`)
- SQL: `ORDER BY duration_ms ASC` + JS 정렬 후 `Math.ceil(n * 0.99) - 1` index
- threshold: 41000ms (p99 ≈ 41s, F658 실측 기반)
- graceful fallback: empty data → `null`

**computeAll()** 갱신
- Promise.allSettled 배열에 `calculateApiP99()` 추가 (api_p95 다음)
- fallback ids 배열에도 `"api_p99"` 추가 (index 동기화 필수)

### 2.2 (b) threshold 갱신

- `kpi-calculator.service.ts:176` threshold `3000` → `40000`
- description 갱신: "LLM 9-stage workflow 기준, threshold 40s"
- trend 조건: `p95 < 40000 ? "down" : "stable"`

### 2.3 (c) cheatsheet 갱신

- `docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md §2.2`
- api_p95 기대값 2800ms → 28~38s 정상 분포 + threshold 40s 보정
- api_p99 신규 행 추가 (threshold 41s)
- 23 v1.4 §10 분포 분석 참조 링크

### 2.4 (d) endpoint latency dashboard (옵션 3)

**D1 schema 변경 없음** — agent_run_metrics 기존 `agent_id` 컬럼 활용

**LatencyByAgentService** (`core/kpi/services/latency-by-agent.service.ts`)
- SQL: `SELECT agent_id, duration_ms FROM agent_run_metrics WHERE ... ORDER BY agent_id ASC, duration_ms ASC`
- JS groupBy: `Map<agent_id, duration_ms[]>` → 각 group 정렬 후 percentile 계산
- percentile 함수: `Math.ceil(n * p) - 1` (calculateApiP95/P99와 동일 알고리즘)
- 응답: `{ agents: AgentLatencyItem[], computedAt: string }`

**LatencyByAgentResponseSchema** (`core/kpi/schemas/latency-by-agent.ts`)
```typescript
AgentLatencyItem: { agentId, count, avg, p50, p75, p95, p99 }
LatencyByAgentResponse: { agents: AgentLatencyItem[], computedAt: string }
```

**GET /api/kpi/latency-by-agent** (`core/kpi/routes/index.ts`)
- 정적 경로 (`/latency-by-agent`)를 `/:id` 동적 라우트보다 **먼저** 등록 (Hono 라우팅 우선순위)
- query params: `since?` (ISO 날짜 필터)
- 인증: KPI 엔드포인트 기존 미들웨어 적용

**AgentLatencyPanel** (`packages/web/src/components/operations/AgentLatencyPanel.tsx`)
- `fetchApi("/kpi/latency-by-agent")` → `/api/kpi/latency-by-agent` 호출
- 테이블 렌더링: agentId / count / p50 / p75 / p95 / **p99** (bold)
- formatMs(): `≥1000ms → Xs`, `<1000 → Nms` 표기
- F621 OrgKpiPanel/OrgHitlPanel과 같은 `rounded-xl border bg-card` 스타일

**operations/index.ts** — `AgentLatencyPanel` export 추가
**operations.tsx** — footer 바로 위에 `<AgentLatencyPanel />` mount

---

## 3. 데이터 흐름

```
Browser → GET /api/kpi/latency-by-agent
  → Hono kpiApp.get("/latency-by-agent")
  → LatencyByAgentService.calculateByAgent()
  → D1 SELECT agent_id, duration_ms FROM agent_run_metrics ...
  → JS groupBy(agent_id) → sort → percentile
  → { agents: [...], computedAt }

Browser → GET /api/kpi
  → KpiCalculatorService.computeAll()
  → [8 existing + calculateApiP99()] = 9 KPI results
  → { kpis: [...9], computedAt }
```

---

## 4. TDD 계약 (Red Phase 테스트)

### kpi-api-p99.test.ts (3 cases, F661 a)
1. 100 rows → p99 = index 98 = 99000ms ✅
2. empty → null ✅
3. KPI_IDS 포함 + computeAll 9개 + api_p95 다음 순서 ✅

### kpi-latency-by-agent.test.ts (3 cases, F661 d)
1. 2 agents fixture → p50/p95 분리 정확 ✅
2. empty → [] ✅
3. 필터 없으면 전체 agent ✅

---

## 5. 파일 매핑 (구현 완료)

### 수정 (Modify)

| # | 파일 | 변경 |
|---|------|------|
| M1 | `core/kpi/types.ts` | KPI_IDS `"api_p99"` 추가 ✅ |
| M2 | `core/kpi/services/kpi-calculator.service.ts` | calculateApiP99() 신규 + threshold 40000 + computeAll 9 ✅ |
| M3 | `core/kpi/routes/index.ts` | `/latency-by-agent` 정적 라우트 추가 ✅ |
| M4 | `packages/web/src/components/kpi/types.ts` | KpiId `"api_p99"` union 추가 ✅ |
| M5 | `packages/web/src/components/operations/index.ts` | AgentLatencyPanel export 추가 ✅ |
| M6 | `packages/web/src/routes/operations.tsx` | AgentLatencyPanel mount ✅ |
| M7 | `packages/api/src/__tests__/kpi.routes.test.ts` | 8→9 kpis count 갱신 ✅ |
| M8 | `packages/api/src/__tests__/kpi-calculator.service.test.ts` | computeAll 8→9 + api_p99 포함 ✅ |
| M9 | `docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md` | §2.2 threshold 갱신 ✅ |

### 신규 (New)

| # | 파일 | 목적 |
|---|------|------|
| N1 | `core/kpi/services/latency-by-agent.service.ts` | LatencyByAgentService ✅ |
| N2 | `core/kpi/schemas/latency-by-agent.ts` | LatencyByAgentResponseSchema ✅ |
| N3 | `packages/web/src/components/operations/AgentLatencyPanel.tsx` | agent별 latency 대시보드 ✅ |
| N4 | `packages/api/src/__tests__/kpi-api-p99.test.ts` | TDD api_p99 테스트 ✅ |
| N5 | `packages/api/src/__tests__/kpi-latency-by-agent.test.ts` | TDD latency-by-agent 테스트 ✅ |

### D1 migration
- **없음** — agent_run_metrics 기존 agent_id 컬럼 활용. idx_arm_agent 인덱스 이미 존재 ✅

---

## 6. Out-of-scope (명시적 제외)

- agent_run_metrics D1 schema 변경 (endpoint 컬럼 등) — 적용 안 함 ✅
- 별도 api_endpoint_latency 테이블 — 적용 안 함 ✅
- F619/F621 baseline 변경 — 0건 ✅
- 4 본부 RBAC unlock — 0건 ✅
- audit-bus 변경 — 0건 ✅

---

## 7. MSA 경계 검증

- LatencyByAgentService: `core/kpi/services/` 내부 ✅
- latency-by-agent.ts schema: `core/kpi/schemas/` 내부 ✅
- 라우트: `core/kpi/routes/index.ts` sub-app 내부 (app.ts 직접 등록 0건) ✅
- cross-domain import: `core/kpi/` 내부만 — 0건 ✅
