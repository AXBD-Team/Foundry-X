---
code: FX-PLAN-395
title: Sprint 395 — F661 api_p99 schema + agent별 threshold 분리 + endpoint latency dashboard (a)+(b)+(c)+(d) full scope
version: 1.0
status: Active
category: PLAN
sprint: 395
feature: F661
req: FX-REQ-723
priority: P3
session: S360
date: 2026-05-14
related:
  - SPEC.md §5 F661
  - docs/specs/ai-foundry-master-plan/23_dry_run_d1_seed_v1.md §10 (F658 api_p95 분포 분석, S359)
  - docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md §2.2 (cheatsheet api_p95 기대값)
  - packages/api/src/core/kpi/services/kpi-calculator.service.ts:155-181 calculateApiP95
  - packages/api/src/core/kpi/types.ts (KPI_IDS enum)
  - packages/api/src/core/kpi/schemas/kpi.ts (KpiResultSchema)
  - packages/api/src/db/migrations/0132_agent_run_metrics.sql (agent_id 컬럼 활용)
  - packages/web/src/components/kpi/MetricGrid.tsx (dynamic array map)
  - packages/web/src/components/operations/ (F621 OrgKpiPanel/OrgHitlPanel 패턴)
---

# Sprint 395 — F661 api_p99 schema 보강 + agent별 threshold 분리 + endpoint latency dashboard (full scope)

## 1. Sprint 컨텍스트

**위상**: BeSir 5/15 D-day **D-1 진행** (사용자 직접 PM). F658 docs-only 종결(S359, `42409754` 23 v1.4 §10 patch) 후속 진정 fix sprint. F660 ✅ MERGED (Sprint 394 S360) + hotfix #818 + daily-check fix #819 직후 연속 sprint. 본 sprint도 시연 영향 0 (KPI dashboard 변경은 시연 7 endpoint와 무관).

**S359 F658 docs-only 종결 시점 측정 결과** (이미 SPEC F661 본문 + 23 v1.4 §10에 기록):
- `calculateApiP95()` threshold **3000ms** (line 176) → 실측 p95=37300ms = **12.4배 초과** (LLM workflow 본질적 latency, 비현실적 threshold)
- agent_run_metrics 분포: `discovery-stage-runner` 134 rows 96.4% (p50=28.6s / p75=32.4s / p90=36.3s / **p95=37.3s** / p99=41s) — long-tail 0, 응집 분포
- 시드 5 rows 3.6%만 2.8s 비현실 기대값 — 평균이 왜곡됨

**의존성**: 독립 (다른 F-item 의존 없음). F604 ✅ KPI 위젯 4종 + F621 ✅ 4 본부 통합 화면 baseline 활용.

**연속 streak**: 58 sprint 연속 성공 (S306~S357 + F619 + F621 + F660). 본 sprint = 59 sprint streak 도전.

**5/15 시연 영향**: 0 — KPI dashboard 운영 페이지 변경. 시연 7 endpoint (cross-org/ethics/diagnostic/Step 1-5) 영향 0.

---

## 2. 목표 (SCOPE LOCKED)

### 2.1 In-Scope (4 part)

**(a) /api/kpi schema api_p99 컬럼 추가** — `core/kpi/`
- `core/kpi/types.ts` KPI_IDS enum에 `"api_p99"` 추가 (`"api_p95"` 다음)
- `core/kpi/services/kpi-calculator.service.ts` `calculateApiP99()` 신규 메서드 — agent_run_metrics duration_ms의 99th percentile (SQL `ORDER BY duration_ms ASC LIMIT 1 OFFSET (CAST(0.99 * COUNT(*) AS INTEGER) - 1)`)
- `computeAll()` 응답 array에 `"api_p99"` 포함 (api_p95 다음 순서)
- `core/kpi/schemas/kpi.ts` — KpiResultSchema 변경 없음 (KPI_IDS enum 확장만)
- frontend `packages/web/src/components/kpi/types.ts:8` enum `"api_p99"` 추가
- 회귀 위험: **낮음** (consumer `kpis.map`이 dynamic array 처리, backward compatible)

**(b) calculateApiP95 threshold 3000 → 40000ms (LLM-aware)** — `kpi-calculator.service.ts:176`
- 현재: `threshold: 3000` (line 176) — 비현실적 (실측 37300ms)
- 변경: `threshold: 40000` (LLM 9-stage workflow 본질적 latency 수용)
- 추가: description 갱신 — "agent_run_metrics duration_ms의 95번째 백분위수 (LLM 9-stage workflow 기준, threshold 40s)"
- 회귀 위험: **0** (단일 숫자 변경, 시각화 색상만 변경)

**(c) cheatsheet §2.2 갱신** — `docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md`
- 현재 (추정): `api_p95 ~2800ms` 기대값 (시드 isolation 가정)
- 변경: `discovery-stage-runner 기준 28~38s 정상 분포 / threshold 40000ms` (실측 반영)
- 추가: 23 v1.4 §10 분포 분석 참조 링크

**(d) endpoint latency dashboard 추가 (옵션 3 — agent_id를 endpoint로 활용)** — `packages/web/src/components/operations/` + `packages/web/src/routes/operations.tsx`
- **D1 schema 변경 없음** (agent_run_metrics 기존 agent_id 컬럼 활용)
- 신규 컴포넌트: `components/operations/AgentLatencyPanel.tsx` — agent_id별 p50/p75/p95/p99 표시
- backend endpoint: `/api/kpi/latency-by-agent?orgId=...&since=...` — agent_id별 latency 분포 반환
- 신규 schema: `LatencyByAgentResponseSchema` — `{ agents: [{ agentId, count, p50, p75, p95, p99, avg }], computedAt }`
- routes/operations.tsx에 AgentLatencyPanel 추가 (F621 OrgKpiPanel + OrgHitlPanel과 같은 grid)
- 회귀 위험: **中** (신규 endpoint + 컴포넌트, F621 baseline 회귀 검증 필수)

### 2.2 Out of Scope (명시적 제외)

- agent_run_metrics D1 schema 변경 (endpoint 컬럼 추가 등)
- 별도 `api_endpoint_latency` 신규 테이블 신설
- F619/F621 baseline 변경 (KPI 위젯 4종 + HITL Console + 통합 화면 그대로 유지)
- 4 본부 RBAC unlock (F601 외부 의존)
- Decode-X stub adapter 변경 (F619 그대로)
- audit-bus emit context 변경 (F660 그대로)
- F658 docs-only 추가 분석 (이미 23 v1.4 §10 완결)
- production smoke 외 e2e 신규 시나리오 (e2e 인프라 부채 F648/F649 별 sprint)

---

## 3. 사전 측정 (fs 실측, Plan 작성 의무화 27회차)

### 3.1 KPI service 현재 구조
- 파일: `packages/api/src/core/kpi/services/kpi-calculator.service.ts`
- 8 methods: calculateBureauActiveCount / calculateCriticalInconsistencyRate / calculateAssetReuseRate / calculateDiagnosticTimeReduction / calculate5LayerE2ESuccessRate / calculateHitlAvgProcessing / **calculateApiP95** / calculateCoreDiffBlockingRate
- `calculateApiP95()` line 155-181: `agent_run_metrics duration_ms` 95th percentile, threshold **3000ms** (line 176, 비현실적)
- `computeAll()` line 206+: 8 method 일괄 실행 + threshold null fallback (api_p95 only 별도 처리)

### 3.2 KPI_IDS enum + Schema
- `core/kpi/types.ts:8` KPI_IDS array에 `"api_p95"` (line 8)
- `core/kpi/schemas/kpi.ts` KpiResultSchema: id/label/value/unit/trend/threshold/description/dataSource
- `KpiListResponseSchema` kpis array

### 3.3 agent_run_metrics 정확 schema
- 컬럼: id / session_id / **agent_id** / status / input_tokens / output_tokens / cache_read_tokens / rounds / stop_reason / **duration_ms** / error_msg / started_at / finished_at / created_at
- 인덱스: idx_arm_session / idx_arm_agent / idx_arm_status
- **endpoint 컬럼 없음** → (d)는 옵션 3 (agent_id로 대체) 적용

### 3.4 Frontend KPI consumer
- `packages/web/src/components/kpi/types.ts:8` enum `"api_p95"`
- `packages/web/src/components/kpi/MetricGrid.tsx:22-23` `kpis.map((kpi) => <KpiTile key={kpi.id} kpi={kpi} />)` — **dynamic array map**, backward compatible ✅

### 3.5 F621 operations 컴포넌트 (재사용 baseline)
- `packages/web/src/components/operations/{OrgHitlPanel,OrgKpiPanel,OrgSelector,index,types}.tsx`
- `packages/web/src/components/operations/__tests__/`
- `packages/web/src/routes/operations.tsx`

### 3.6 cheatsheet 위치
- `docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md` — §2.2 api_p95 기대값 (정확 본문은 autopilot이 fs 측정)

---

## 4. 파일 매핑

### 4.1 수정 (Modify)

| # | 파일 | 변경 |
|---|------|------|
| M1 | `core/kpi/types.ts:8` | KPI_IDS array에 `"api_p99"` 추가 |
| M2 | `core/kpi/services/kpi-calculator.service.ts` (line 181 직후) | `calculateApiP99()` 신규 method (99th percentile SQL) |
| M3 | `core/kpi/services/kpi-calculator.service.ts` (line 206+ computeAll) | api_p99 호출 + 응답 list 포함 (api_p95 다음 순서) |
| M4 | `core/kpi/services/kpi-calculator.service.ts:176` | threshold 3000 → 40000 + description 갱신 |
| M5 | `core/kpi/routes/index.ts` | 응답 schema 그대로 (KpiListResponseSchema dynamic, 별 변경 없음 — autopilot 검증) |
| M6 | `packages/web/src/components/kpi/types.ts:8` | enum `"api_p99"` 추가 |
| M7 | `packages/web/src/routes/operations.tsx` | AgentLatencyPanel 추가 mount |
| M8 | `docs/specs/ai-foundry-master-plan/24_production_apply_cheatsheet_v1.md` §2.2 | api_p95 기대값 → 28~38s 분포 + threshold 40s 갱신 |

### 4.2 신규 (New)

| # | 파일 | 목적 |
|---|------|------|
| N1 | `core/kpi/services/latency-by-agent.service.ts` | (d) LatencyByAgentService class — calculateByAgent(orgId?, since?) method |
| N2 | `core/kpi/schemas/latency-by-agent.ts` | (d) LatencyByAgentResponseSchema + LatencyByAgentQuerySchema |
| N3 | `core/kpi/routes/index.ts` (handler 추가) | (d) `GET /api/kpi/latency-by-agent?orgId=&since=` endpoint |
| N4 | `packages/web/src/components/operations/AgentLatencyPanel.tsx` | (d) agent별 p50/p75/p95/p99 시각화 컴포넌트 |
| N5 | `packages/api/src/__tests__/kpi-api-p99.test.ts` | (a) api_p99 SQL 정확성 + KPI_IDS enum 통합 test |
| N6 | `packages/api/src/__tests__/kpi-latency-by-agent.test.ts` | (d) LatencyByAgentService SQL + agent별 분리 정확성 test |

### 4.3 D1 migration
- **없음** — 기존 agent_run_metrics 컬럼 활용 (옵션 3). agent_id 인덱스(`idx_arm_agent`)도 이미 존재 ✅

---

## 5. TDD Red Phase 설계

### 5.1 (a) kpi-api-p99.test.ts (신규)

**테스트 계약** (3 cases):
1. `calculateApiP99 — 100 rows fixture에서 p99 정확 반환` (99th index = duration_ms ASC LIMIT 1 OFFSET 98)
2. `calculateApiP99 — empty data 0 또는 null 반환` (graceful fallback)
3. `KPI_IDS enum + KpiResultSchema에 api_p99 통합 + computeAll 응답 list 포함 검증`

### 5.2 (d) kpi-latency-by-agent.test.ts (신규)

**테스트 계약** (3 cases):
1. `LatencyByAgentService — 2 agents fixture (discovery-stage-runner 10 rows + decode-x-evidence-collector 5 rows) → 각 agent p50/p75/p95/p99 정확 분리`
2. `LatencyByAgentService — orgId 필터 적용 (선택)`
3. `LatencyByAgentService — empty data 빈 array 반환`

### 5.3 (b) threshold 변경 test
- 기존 calculateApiP95 test가 있으면 threshold 3000 → 40000 갱신 (회귀 0)
- 없으면 별 test 안 추가 (단순 숫자 변경)

### 5.4 frontend AgentLatencyPanel
- vitest snapshot test 1건 (mock 2 agents fixture → grid 정확 렌더링)

---

## 6. 위험 + 대응

| # | 위험 | 가능성 | 대응 |
|---|------|-------|------|
| R1 | KPI_IDS enum 확장이 외부 consumer break | 低 | `kpis.map` dynamic 패턴 확증 ✅. frontend types union 추가는 backward compatible |
| R2 | calculateApiP99 SQL 비효율 (OFFSET 큰 값) | 中 | agent_run_metrics 134 rows = 99th OFFSET 132로 작음. production 환경에서 row 증가 시 인덱스 필요 (현재 created_at 인덱스 없음, but 데이터 적어 영향 0) |
| R3 | threshold 변경 후 production KPI 위젯 시각화 색상 변경 | 中 | 의도적 변경 (정상 latency = green 표시). F604/F621 회귀 검증 필수 |
| R4 | AgentLatencyPanel이 F621 통합 화면 layout 깨뜨림 | 中 | OrgKpiPanel + OrgHitlPanel과 같은 grid 패턴 재사용. snapshot test로 회귀 검증 |
| R5 | turbo cache 함정 (S337) — types 변경 후 typecheck stale PASS | 中 | `pnpm exec tsc --noEmit` 직접 + `pnpm turbo run typecheck --force` cache 0건 검증 (S337 rule 4회차) |
| R6 | production deploy 후 /api/kpi 응답 회귀 | 中 | multi-input smoke probe — GET /api/kpi (orgId 없음) / orgId=demo-org-001 / orgId=invalid 모두 200 응답 + KpiListResponseSchema 정합 |
| R7 | dual_ai_reviews hook 정상 동작 (48 sprint streak → 49) | 低 | PR 생성 후 hook 자동 트리거 확인 |
| R8 | reports hallucination 14회차 변종 재현 | 中 | Plan §7 P-b/P-e "reports/sprint-395-*.md 신규 파일 N건 생성" 명시 강제화. PR body 수치만으로 등치 처리 금지 |

---

## 7. Phase Exit 체크리스트 (Smoke Reality 12항, P-a~P-l)

| # | 항목 | 판정 기준 |
|---|------|----------|
| P-a | 사전 측정 fs 실측 결과 정확 (Plan §3 7항 모두 본 Plan과 100% 일치) | grep + ls 결과 reports 첨부 |
| P-b | (a) calculateApiP99 신규 + KPI_IDS enum 통합 + computeAll 응답 list 포함 + test 3 PASS | vitest reports/sprint-395-test-results.md 신규 파일 첨부 |
| P-c | (b) threshold 3000 → 40000 변경 + description 갱신 | diff reports/sprint-395-threshold-change.md 첨부 |
| P-d | (c) cheatsheet §2.2 갱신 (28~38s 분포 + threshold 40s 반영 + 23 v1.4 §10 링크) | docs diff |
| P-e | (d) LatencyByAgentService + endpoint + AgentLatencyPanel 신설 + test 3 PASS + frontend snapshot 1 PASS | vitest reports 첨부 |
| P-f | `pnpm exec tsc --noEmit` packages/api + packages/web 직접 PASS (S337 turbo cache 우회) | cache 0건 결과 reports |
| P-g | `pnpm turbo run lint --force` MSA baseline 회귀 0 | eslint cross-domain 0건 추가 (kpi 도메인 내부만) |
| P-h | 기존 회귀 0건 — F604 (KPI 위젯 4종) + F621 (4 본부 통합 화면) + F619 (multi-evidence) 회귀 0 | F604/F621/F619 test PASS + reports 첨부 |
| P-i | dual_ai_reviews sprint 395 자동 INSERT ≥ 1건 (hook 49 sprint 연속) | D1 query verdict 확인 |
| P-j | e2e 회귀 0 — F644/F646/F649 부채 baseline 유지 (본 sprint은 e2e 인프라 fix 아님) | shard 1/2/3/4 baseline 유지 |
| P-k | cross-domain import 0건 추가 — kpi 도메인 내부만 변경, 외부 도메인 import 0 | eslint no-cross-domain-import 통과 |
| P-l | **5/15 시연 영향 0** — production deploy 후 multi-input smoke probe (GET /api/kpi 3 input + GET /api/kpi/latency-by-agent 3 input) HTTP 200/400 일관 + `wrangler tail` 30s runtime exception 0 | smoke reports 첨부 |

---

## 8. 회귀 테스트 계획

### 8.1 회귀 대상 (전수 측정 8 영역)

1. `kpi-calculator.test.ts` 기존 8 method 회귀
2. `hitl-queue-collector.test.ts` (F605 baseline)
3. `multi-evidence.service.test.ts` (F619 baseline)
4. F621 통합 화면 컴포넌트 vitest snapshot (operations/OrgKpiPanel/OrgHitlPanel)
5. `audit-trace-chain.test.ts` (F660 직전 baseline)
6. `cross-org-enforcer.test.ts` (F660 baseline)
7. e2e shard baseline (F644/F646 직전 결과)
8. production smoke 7 endpoint (Step 1-5 + cross-org/ethics/diagnostic — F660 baseline)

### 8.2 회귀 측정 명령
```bash
cd packages/api && pnpm exec vitest run --reporter=verbose 2>&1 | tee reports/sprint-395-regression.log
cd packages/web && pnpm exec vitest run --reporter=verbose 2>&1 | tee reports/sprint-395-web-regression.log
```

### 8.3 turbo cache 우회 (S337 4회차)
```bash
pnpm turbo run typecheck --force 2>&1 | tee reports/sprint-395-typecheck-force.log
pnpm exec tsc --noEmit -p packages/api/tsconfig.json
pnpm exec tsc --noEmit -p packages/web/tsconfig.json
```

---

## 9. 의존 + 일정

### 9.1 의존성
- F604 ✅ KPI 위젯 4종 (Sprint 377)
- F605 ✅ HITL Console (Sprint 378)
- F619 ✅ Multi-Evidence Integration (Sprint 392)
- F621 ✅ 4 본부 통합 화면 (Sprint 393)
- F642 ✅ audit_logs trace_id (Sprint 379)
- F660 ✅ audit-bus 통합 view (Sprint 394 직전 ✅)
- D1 migration 변경 0 (agent_run_metrics 기존 컬럼 활용)

### 9.2 시간 예상
- (a) calculateApiP99 + types + test: ~20~30분
- (b) threshold 변경 1줄 + test 갱신: ~5분
- (c) cheatsheet docs: ~10분
- (d) LatencyByAgentService + endpoint + AgentLatencyPanel + 2 test: ~40~60분
- 회귀 검증 + typecheck cache 우회 + smoke probe: ~15분
- Plan → Design → TDD Red → Green → Gap → Report → PR autopilot: **~1.5~2h**

### 9.3 시동 타이밍
- D-1 진행, 5/15 시연 영향 0 — Merge 5/15 전이든 후든 시연 무관
- Match Rate < 90% 또는 e2e 회귀 발생 시 D+1로 미루기 가능

---

## 10. autopilot 지침 (참고)

### SCOPE LOCKED prompt 패턴
```
F661 (a)+(b)+(c)+(d) full scope. In-scope §2.1만 진행. Out-of-scope §2.2 명시 차단 — agent_run_metrics D1 schema 변경 / 별 endpoint_latency 테이블 / F619/F621 baseline 변경 / 4 본부 RBAC unlock / audit-bus 변경 일절 금지.

Plan §3 사전 측정 7항 정확 적용 (KpiCalculator 위치 + KPI_IDS enum + agent_run_metrics agent_id 컬럼 + MetricGrid dynamic map + operations 컴포넌트 위치).

(d) 옵션 3 (agent_id를 endpoint로 활용) 정확 적용 — D1 migration 0건. agent_id별 latency 분리 SQL은 GROUP BY agent_id + percentile per group.

Phase Exit P-a~P-l 12항 모두 self-evaluation 후 **reports/sprint-395-*.md 신규 파일 N건 생성** (반드시 ls 실파일 검증, hallucination 14회차 변종 회피).

S337 turbo cache 함정 회피 — pnpm exec tsc --noEmit + --force 검증 필수.
rules "Production Smoke Test" 16회차 변종 회피 — multi-input probe (/api/kpi + /api/kpi/latency-by-agent 각 3 input).
```

---

## 11. 메타 학습 (rules 정착 참조)

- rules `development-workflow.md` "Production Smoke Test" 16회차 변종 회피
- rules `development-workflow.md` "Turbo Cache 함정" 4회차
- rules `agent-team-patterns.md` "범위 관리 3-Layer" — Plan §2.2 Out of scope 명시
- rules `interaction-patterns.md` 26회차 패턴 — Plan 사전 측정 fs 실측 의무화
- **S360 신규 학습** — autopilot reports hallucination 14회차 변종 부분 패턴 → Plan §7 P-b/P-e/P-l "reports/sprint-NNN-*.md 신규 N건 생성" 명시 강제화 (F660 교훈 적용)

---

## 12. 다음 사이클 후보 (Sprint 395 완결 후, out-of-scope)

- **F649 e2e 인프라 fix** (F648 H5 playwright webServer API server step 추가)
- **F600 5-Layer 통합** (F601 PG unlock 후)
- **5/15 BeSir D-day 진행** (시연 + Q&A)
- **F644 P-i master push e2e workflow GREEN 검증** (F649 fix 후 자연 동반)
- **F647 sidebar group expand race condition** 정밀 진단 (F646 잔존)
- agent_run_metrics endpoint 컬럼 추가 (별 sprint, 추후 필요 시) — F661 (d)는 agent_id로 우회 처리
