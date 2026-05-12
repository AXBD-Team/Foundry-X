---
title: "AI Foundry KPI 산정 메커니즘 표 v2 — production 실측 + F621 통합 시각화"
version: v2
date: 2026-05-12
sprint: 393
feature: F604 + F621
owner: Sinclair Seo
status: BeSir 5/14 dry-run + 5/15 미팅 정본 — production 실측 + F621 4 본부 통합 시각화 매핑
predecessor: 21_kpi_calculation_table_v1.md (v1, S348 Sprint 377 작성, 보존)
related_docs:
  - 17_internal_dev_plan_with_besir_v2.md (Tier 진척, F604 ✅ Sprint 377 + F621 ✅ Sprint 393)
  - 20_live_demo_scenario_v2.md (Step 7 `/operations` URL 시연)
  - 22_hitl_console_v2.md (KPI-6 hitl_avg_processing + F621 통합 HITL 패널)
  - 16_validation_report_v1.md §2.3 #6 영구 해소 baseline
---

# 21. AI Foundry KPI 산정 메커니즘 표 v2

> **본 문서의 위상**: v1(S348 Sprint 377, 2026-05-10)에서 8 KPI 산정 표 + 구현 위치를 명문화한 것 위에, **production 실측 정합성 + F621 운영 통합 화면(`/operations`) 시각화 매핑 + graceful degradation 동작 + orgId filter 비대칭**을 추가. v1 본문은 그대로 보존(소급 수정 없음), 본 v2가 5/14 dry-run + 5/15 미팅 정본.

---

## 1. v1 → v2 변경 요약

| 항목 | v1 (S348) | v2 (S357) |
|------|-----------|-----------|
| KPI 정의 | 8 KPI (label/SQL/주기/단위/임계값) | v1 그대로 + **KpiResult 응답 shape** + **trend 자동 산정 룰** |
| 시각화 | `/dashboard` (단일) | + **`/operations` (4 본부 동시)** |
| orgId filter | 명시 없음 | **2 KPI만 본부별 분기** (bureau_active_count + critical_inconsistency_rate) |
| Graceful degradation | 미명시 | **Promise.allSettled — 1 KPI 실패해도 응답 200, 해당 KPI만 null+unknown** |
| 미측정 대응 | null로 반환 | v1 그대로 + **trend "unknown" 명시 + F621에서 "—" 표시 정합성** |
| 시연 시나리오 | 별도 미명시 | **5/14 dry-run + 5/15 미팅 Step 7 (URL 시연) 매핑 + KPI별 기대값** |

---

## 2. 8 KPI 산정 표 (v1 그대로 유지)

| # | KPI id | 정의 | D1 소스 | SQL 또는 산정 수식 | 주기 | 단위 | 임계값 | orgId filter | §2.3 매핑 |
|---|--------|------|---------|----------------------|------|------|--------|---------------|----------|
| KPI-1 | `bureau_active_count` | 본부 동시 운영 수 | `graph_sessions` (0135) | `SELECT COUNT(DISTINCT org_id) FROM graph_sessions WHERE status = 'running'` (+ optional `AND org_id = ?`) | 실시간 | 개 | ≥ 4 | ✅ 지원 | P0-5 |
| KPI-2 | `critical_inconsistency_rate` | feedback_queue failed 비율 | `feedback_queue` (0094) | `SELECT SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM feedback_queue` (+ optional `WHERE org_id = ?`) | 일간 | % | < 10% | ✅ 지원 | P0-3 |
| KPI-3 | `asset_reuse_rate` | cache_read_tokens > 0 + output_tokens > 0 비율 | `agent_run_metrics` (0132) | `SELECT SUM(CASE WHEN output_tokens > 0 AND cache_read_tokens > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM agent_run_metrics` | 주간 | % | ≥ 30% | ❌ 전사 | P0-5 |
| KPI-4 | `diagnostic_time_reduction` | 완료된 graph_sessions 평균 소요(분) | `graph_sessions` (0135) | `SELECT AVG((julianday(completed_at) - julianday(started_at)) * 86400) FROM graph_sessions WHERE status='completed'` ÷ 60 (application layer) | 주간 | 분 | < 30분 | ❌ 전사 | P0-3 |
| KPI-5 | `five_layer_e2e_success_rate` | graph_sessions completed 비율 | `graph_sessions` (0135) | `SELECT SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM graph_sessions` | 일간 | % | ≥ 90% | ❌ 전사 | P0-1 |
| KPI-6 | `hitl_avg_processing` | dual_ai_reviews 양방향 verdict 완료율 | `dual_ai_reviews` (0138) | `SELECT AVG(CASE WHEN codex_verdict IS NOT NULL AND claude_verdict IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 FROM dual_ai_reviews` | 스프린트별 | % | ≥ 80% | ❌ 전사 | P0-6 |
| KPI-7 | `api_p95` | agent_run_metrics duration_ms p95 | `agent_run_metrics` (0132) | `SELECT duration_ms FROM agent_run_metrics WHERE status='completed' ORDER BY duration_ms ASC` → application p95 계산 (`Math.ceil(N*0.95)-1` index) | 주간 | ms | < 3,000ms | ❌ 전사 | P0-5 |
| KPI-8 | `core_diff_blocking_rate` | dual_ai_reviews BLOCK 비율 | `dual_ai_reviews` (0138) | `SELECT SUM(CASE WHEN codex_verdict='BLOCK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM dual_ai_reviews` | 스프린트별 | % | < 5% | ❌ 전사 | P0-4 |

---

## 3. NEW v2 — production API 응답 shape

### 3.1 GET /api/kpi (8 KPI 일괄)

**Query**: `?orgId=demo-org` (optional)

**Response 200**:

```json
{
  "kpis": [
    {
      "id": "bureau_active_count",
      "label": "본부 동시 운영 수",
      "value": 4,
      "unit": "개",
      "trend": "stable",
      "threshold": 4,
      "description": "현재 graph_sessions 테이블에서 status=running인 고유 org 수",
      "dataSource": "graph_sessions (0135)"
    },
    {
      "id": "critical_inconsistency_rate",
      "label": "Critical inconsistency 비율",
      "value": 5.2,
      "unit": "%",
      "trend": "down",
      "threshold": 10,
      "description": "feedback_queue 중 status=failed 비율 (낮을수록 좋음)",
      "dataSource": "feedback_queue (0094)"
    },
    // ... 8 KPI 모두 동일 shape
  ],
  "computedAt": "2026-05-15T05:00:00Z"
}
```

### 3.2 GET /api/kpi/:id (단건)

**Query**: `?orgId=demo-org` (optional)

**Response 200**: 단일 `KpiResult` 객체 (`{id, label, value, unit, trend, threshold, description, dataSource}`)

**Response 404**: `{ "error": "Unknown KPI id: xxx. Valid ids: bureau_active_count, ..." }` — KPI_IDS 8건 외 요청 시

### 3.3 trend 자동 산정 룰 (NEW v2)

각 KPI별로 production service에서 자동 산정:

| KPI | trend up | trend down | trend stable | trend unknown |
|-----|----------|------------|---------------|---------------|
| KPI-1 bureau_active_count | — | — | 기본값 | 데이터 없음 |
| KPI-2 critical_inconsistency_rate | — | value < 10 (목표 달성) | 그 외 | value=null |
| KPI-3 asset_reuse_rate | value > 30 (목표 달성) | — | 그 외 | value=null |
| KPI-4 diagnostic_time_reduction | — | value < 30 (목표 달성) | 그 외 | value=null |
| KPI-5 five_layer_e2e_success_rate | value ≥ 90 (목표 달성) | — | 그 외 | value=null |
| KPI-6 hitl_avg_processing | — | — | 기본값 | 데이터 없음 |
| KPI-7 api_p95 | — | value < 3000 (목표 달성) | 그 외 | value=null |
| KPI-8 core_diff_blocking_rate | — | value < 5 (목표 달성) | 그 외 | value=null |

**원칙**: "낮을수록 좋음" KPI는 목표 달성 시 `down` / "높을수록 좋음" KPI는 `up`. value가 null이면 `unknown` (계산 오류).

### 3.4 Graceful degradation (NEW v2)

`KpiCalculatorService.computeAll()`은 `Promise.allSettled()` 사용:

- 8 KPI 중 1건 실패해도 전체 응답 HTTP 200
- 실패한 KPI는 `{value: null, trend: "unknown", description: "계산 오류", dataSource: ""}` 로 응답
- **운영 영향**: D1 schema mismatch 또는 1 테이블 부재 시 7 KPI는 정상 표시, 1 KPI만 "—" 표시
- 5/15 BeSir 미팅 시연 시 D1 시드 누락 KPI는 자동 null 처리 → 시연 중단 risk 0

---

## 4. NEW v2 — F621 운영 통합 화면 매핑

### 4.1 화면 구조 (Step 7 URL 시연 본문)

```
/operations (F621, Sprint 393)
  ├── OrgSelector (필터: all / KOAMI / AXIS-DS / Decode-X / Foundry-X)
  └── 4 본부 column grid (filter='all' 시) 또는 1 column (단일 본부)
        ├── OrgKpiPanel (org당 1개)
        │   └── MetricGrid (F604 재사용)
        │       └── KpiTile (4 위젯, KPI-1~4 또는 KPI-5~8 표시)
        └── OrgHitlPanel (org당 1개)
            ├── HitlMetricsTile (F605 재사용)
            └── HitlEscalationBadge
```

### 4.2 4 본부 column에서 8 KPI 표시 매핑

| KPI | 시각화 위치 | 본부별 차이 |
|-----|------------|------------|
| KPI-1 `bureau_active_count` | 모든 본부 column header 또는 footer (단일 값) | orgId filter 있어도 의미 변동 (자기 본부 active=0/1) |
| KPI-2 `critical_inconsistency_rate` | 본부별 column (orgId filter 적용) | ✅ 본부별 다른 값 |
| KPI-3~8 (전사 KPI 6건) | 본부별 column에 동일 값 표시 | ❌ 본부별 동일 |

**디자인 의도** (NEW v2): F621 운영 통합 화면은 "**4 본부가 동일 KPI를 동시에 보지만, 본부별 분기는 2 KPI에서만 발생**"이라는 패턴 — 본부장에게 "내 본부와 다른 본부의 차이"를 빠르게 식별. 전사 KPI 6건은 reference baseline.

**F601 SSO unlock 후**: 본부별 orgId filter API 호출(`GET /api/kpi?orgId=KOAMI`) 가능해지면, 8 KPI 전체가 본부별 분기 가능 (KPI-3~8 service 메서드에 orgId 파라미터 추가 = ~30분 sprint).

### 4.3 dashboard vs operations 화면 차이

| 항목 | `/dashboard` (F604, Sprint 377) | `/operations` (F621, Sprint 393) |
|------|----------------------------------|-----------------------------------|
| 본부 표시 | 단일 본부(현재 사용자) | 4 본부 동시 |
| KPI fetch | `GET /api/kpi` (orgId=auto-detect) | `GET /api/kpi` (orgId=undefined, 전사) |
| HITL fetch | (직접 fetch X — KPI에 통합) | `GET /api/hitl/queue` (orgId filter 없이 전체, frontend filtering) |
| 위젯 재사용 | MetricGrid + KpiTile × 8 | MetricGrid + KpiTile × N + OrgHitlPanel × 4 |
| RBAC | 자기 본부 자동 식별 | demo orgUnits 4 본부 hardcoded (F601 unlock 후 dynamic) |
| 시연 용도 | 5/15 미팅 단일 본부 view (선택) | **5/15 미팅 Step 7 본 시연 (4 본부 동시)** |

---

## 5. NEW v2 — 5/14 dry-run + 5/15 미팅 시연 시 KPI 기대값

### 5.1 5/14 dry-run 사전 D1 시드 후 기대값

20 demo v2 §5.2 A (D1 시드 적용) 후 8 KPI 기대값:

| KPI | 기대값 (D1 시드 후) | null 가능성 | 시연 시 표시 |
|-----|---------------------|-------------|--------------|
| KPI-1 bureau_active_count | 1~4 (demo-org + 다른 graph_sessions 누적 따라) | ❌ | "X개" |
| KPI-2 critical_inconsistency_rate | 0% (feedback_queue 시드 안 한 경우) 또는 demo seed 값 | ✅ feedback_queue 빈 경우 | "0%" 또는 "—" |
| KPI-3 asset_reuse_rate | 0~30% (agent_run_metrics 운영 누적) | ✅ agent_run_metrics 비어있는 경우 | "X%" 또는 "—" |
| KPI-4 diagnostic_time_reduction | 운영 누적 평균 (분) | ✅ completed graph_sessions 없는 경우 | "X분" 또는 "—" |
| KPI-5 five_layer_e2e_success_rate | 누적 비율 | ✅ graph_sessions 비어있는 경우 | "X%" 또는 "—" |
| KPI-6 hitl_avg_processing | 누적 비율 | ✅ dual_ai_reviews 비어있는 경우 | "X%" 또는 "—" |
| KPI-7 api_p95 | 누적 p95 (ms) | ✅ agent_run_metrics 비어있는 경우 | "X ms" 또는 "—" |
| KPI-8 core_diff_blocking_rate | 누적 비율 | ✅ dual_ai_reviews 비어있는 경우 | "X%" 또는 "—" |

**시연 안전 룰** (NEW v2):
- 5/15 미팅 전 5/13~5/14 dry-run에서 8 KPI 모두 응답 정합성 + null 처리 확인
- 만약 모든 KPI가 null이면 "데이터 축적 중" 메시지로 demo 진행 (Step 7에서 trend 화면 보다 화면 구조 자체를 시연 강조)
- 만약 1~3 KPI만 null이면 정상 — graceful degradation 정상 동작 증거로 활용

### 5.2 미측정 KPI 대응 시연 멘트

> "데이터가 아직 축적되지 않은 KPI는 '—' 으로 표시. Promise.allSettled로 1건 실패가 전체 응답에 영향 주지 않음. 운영 진행에 따라 자동으로 값이 채워집니다."

이 멘트로 **graceful degradation을 단점이 아닌 장점으로 reframing**.

---

## 6. 구현 위치 정합성 (v1 그대로 + 검증 갱신)

### 6.1 API 서비스

- **`packages/api/src/core/kpi/services/kpi-calculator.service.ts`** — `KpiCalculatorService` class, 8 method + `computeAll()` Promise.allSettled (S357 master HEAD `eb8185a4` 검증 ✅)
- **`packages/api/src/core/kpi/routes/index.ts`** — `GET /api/kpi` (line 8) + `GET /api/kpi/:id` (line 15) (S357 검증 ✅)
- **`packages/api/src/core/kpi/types.ts`** — `KPI_IDS` 8건 + `KpiResult` interface + `KpiListResponse` (S357 검증 ✅)
- **`packages/api/src/core/kpi/schemas/`** — zod (NEW v2 검증, 존재 확인)

### 6.2 Web 위젯

- **`packages/web/src/components/kpi/`** — `KpiTile.tsx` / `MetricGrid.tsx` / `Sparkline.tsx` / `TrendArrow.tsx` / `index.ts` / `types.ts` (S357 검증 ✅)
- **`packages/web/src/routes/dashboard.tsx`** — `/api/kpi` 호출 + MetricGrid 렌더링 (F604 ✅)
- **`packages/web/src/routes/operations.tsx`** — `/api/kpi` + `/api/hitl/queue` 호출 + 4 본부 grid + MetricGrid 재사용 + OrgHitlPanel 통합 (F621 ✅ NEW v2)

### 6.3 Production smoke 검증 (S357 갱신)

| 검증 | endpoint | 응답 | 결과 |
|------|----------|------|------|
| no auth | `GET /api/kpi` | 401 (full authMiddleware 통과 못 함) | ✅ S357 |
| no auth | `GET /api/hitl/queue` | 401 | ✅ S357 |
| unknown KPI | `GET /api/kpi/foo` (auth 후) | 404 + error 메시지 | ✅ |
| valid orgId | `GET /api/kpi?orgId=demo-org` (auth 후) | 200 + 8 KPI 응답 | ✅ |
| web route | `/operations` (no JWT) | 200 (SPA → login redirect) | ✅ |

---

## 7. 미측정 KPI 대응 (v1 그대로 + Graceful degradation 명시)

KPI-2 (feedback_queue 데이터 축적 전) / KPI-6 (dual_ai_reviews 리뷰 누적 전) 등은 `value: null`로 반환 — UI에서 "—" 표시. 데이터 축적 후 자동 활성화.

**v2 추가**: 산정 메서드 자체가 실패해도(D1 schema mismatch 등) `Promise.allSettled`로 graceful, response.kpis 배열 길이 항상 8 유지, trend="unknown" + description="계산 오류"로 분기.

---

## 8. 이력

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| v1 | 2026-05-10 | 최초 작성 (Sprint 377 F604, S348). 8 KPI 산정 표 + 구현 위치 명문화 | Sinclair |
| v2 | 2026-05-12 | F621 ✅ Sprint 393 통합 화면 매핑 + production API shape + graceful degradation + orgId filter 비대칭 + 5/14 dry-run + 5/15 미팅 시연 매핑. v1 보존, v2 정본 | Sinclair (S357) |

---

**Status**: v2.0 (S357, 2026-05-12) — production 실측 + F621 4 본부 통합 시각화 매핑 완료. 5/14 BeSir D-2 dry-run + 5/15 W19 본 미팅 정본 KPI 자료. 20 demo v2 Step 7 (URL 시연) 본문 보강 자료.
