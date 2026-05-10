---
title: "AI Foundry KPI 산정 메커니즘 표 v1"
version: v1
date: 2026-05-10
sprint: 377
feature: F604
owner: Sinclair Seo
status: 신규 — BeSir 5/15 D-day 이전 토대 완결
reference: "16_validation_report_v1.md §2.3 #6 — 산정 메커니즘 부재 영구 해소"
---

# AI Foundry KPI 산정 메커니즘 표 v1

> **목적**: 16 v1.1 §2.3 권고 #6 "KPI 산정 메커니즘 명문화" 영구 해소.
> 8 KPI 각각의 데이터 소스, SQL, 주기, 단위, 임계값을 명시한다.

## 8 KPI 산정 표

| # | KPI명 | 정의 | D1 데이터소스 | SQL 또는 산정 수식 | 주기 | 단위 | 임계값 | §2.3 #6 매핑 |
|---|-------|------|------------|----------------|------|------|--------|------------|
| KPI-1 | 본부 동시 운영 수 | 현재 5-Layer E2E가 동시에 진행 중인 본부(org) 수 | `graph_sessions` (0135) | `SELECT COUNT(DISTINCT org_id) FROM graph_sessions WHERE status = 'running'` | 실시간 | 개 | ≥ 4 | P0-5 KPI 대시보드 |
| KPI-2 | Critical inconsistency 비율 | feedback_queue 중 처리 실패(status=failed) 비율 | `feedback_queue` (0094) | `SELECT SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM feedback_queue` | 일간 | % | < 10% | P0-3 4대 진단 연계 |
| KPI-3 | 자산 재사용률 | cache_read_tokens > 0인 agent run 비율 (Anthropic prompt cache 활용) | `agent_run_metrics` (0132) | `SELECT SUM(CASE WHEN cache_read_tokens > 0 AND output_tokens > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM agent_run_metrics` | 주간 | % | ≥ 30% | P0-5 자산 재사용률 |
| KPI-4 | 진단 시간 단축 | 완료된 graph_sessions의 평균 소요 시간 (낮을수록 좋음) | `graph_sessions` (0135) | `SELECT AVG((julianday(completed_at) - julianday(started_at)) * 86400 / 60) FROM graph_sessions WHERE status = 'completed' AND completed_at IS NOT NULL` | 주간 | 분 | < 30분 | P0-3 진단 자동화 |
| KPI-5 | 5-Layer E2E 성공률 | 전체 graph_sessions 중 completed 비율 | `graph_sessions` (0135) | `SELECT SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM graph_sessions` | 일간 | % | ≥ 90% | P0-1 5-Layer 통합 |
| KPI-6 | HITL 평균 처리율 | dual_ai_reviews 중 양방향 verdict 완료 비율 | `dual_ai_reviews` (0138) | `SELECT AVG(CASE WHEN codex_verdict IS NOT NULL AND claude_verdict IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 FROM dual_ai_reviews` | 스프린트별 | % | ≥ 80% | P0-6 HITL Console |
| KPI-7 | API p95 응답시간 | agent_run_metrics duration_ms 95번째 백분위수 (낮을수록 좋음) | `agent_run_metrics` (0132) | `SELECT duration_ms FROM agent_run_metrics WHERE status='completed' ORDER BY duration_ms ASC` → 애플리케이션 레이어에서 p95 계산 | 주간 | ms | < 3,000ms | P0-5 성능 지표 |
| KPI-8 | core_diff default-deny 차단율 | dual_ai_reviews 중 codex_verdict=BLOCK 비율 (낮을수록 좋음) | `dual_ai_reviews` (0138) | `SELECT SUM(CASE WHEN codex_verdict='BLOCK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM dual_ai_reviews` | 스프린트별 | % | < 5% | P0-4 Cross-Org core_diff |

## 구현 위치

- **API 산정 서비스**: `packages/api/src/core/kpi/services/kpi-calculator.service.ts`
  - `KpiCalculatorService` class — 8 method, D1 직접 쿼리
- **API 엔드포인트**: `packages/api/src/core/kpi/routes/index.ts`
  - `GET /api/kpi` — 8 KPI 일괄 응답 (`KpiListResponse`)
  - `GET /api/kpi/:id` — 단건 (KpiId 유효성 검사)
- **Web 위젯**: `packages/web/src/components/kpi/`
  - `KpiTile.tsx` — 개별 KPI 카드
  - `Sparkline.tsx` — SVG 라인 차트
  - `MetricGrid.tsx` — KPI 격자 레이아웃
  - `TrendArrow.tsx` — 추세 방향 표시
- **Dashboard 연동**: `packages/web/src/routes/dashboard.tsx` — `/api/kpi` 호출 + MetricGrid 렌더링

## 미측정 KPI 대응 (BeSir 5/15 시연 안전 플랜)

KPI-2 (feedback_queue 데이터 축적 전) / KPI-6 (dual_ai_reviews 리뷰 누적 전) 등은
`value: null`로 반환 — UI에서 "—"로 표시. 데이터 축적 후 자동 활성화.

## 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-05-10 | 최초 작성 (Sprint 377 F604, S348) |
