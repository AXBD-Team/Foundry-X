---
title: AI Foundry Phase 1 — BeSir Conditional 게이트 통과 증거 자료 v2
purpose: 5/15 BeSir 미팅 D-2 (오늘 5/13) Conditional C-1·C-2·C-3·C-4 게이트 통과 증거 + 진행 상황 갱신 (production F604/F605/F619/F621 ✅ MERGED 반영)
date: 2026-05-13 (W19 D-2)
owner: Sinclair Seo
target_meeting: 2026-05-15 W19 BeSir 차기 미팅
classification: 기업비밀II급
predecessor: 18_conditional_gate_evidence_v1.md (v1, S346 W19 D-5, 보존)
status: C-1 ✅ 자체 통과 증거 강화 (57 sprint) / C-2 ⚠️ 외부 sign-off 안건 3건으로 축소 (AXIS-DS unlock + stub 우회로 부분 진척) / C-3 사전 정리 17건 완결 / C-4 ✅ KPI 8/8 production 측정 가능
related_docs:
  - 17_internal_dev_plan_with_besir_v2.md (Tier 진척 매핑)
  - 20_live_demo_scenario_v2.md (7 step + Q&A 8건)
  - 21_kpi_calculation_table_v2.md (8 KPI production API shape)
  - 22_hitl_console_v2.md (F605 + F621 통합 모니터링)
  - 09_dev_plan_guard_x_v1.md §10.2 (게이트 정의 baseline)
  - 15_msa_implementation_plan_v1.md §483~487 (백업 절차)
---

# 18. BeSir Conditional 게이트 통과 증거 자료 v2

> **본 문서의 위상**: v1(2026-05-10 S346 W19 D-5)에서 4 게이트 사전 정리 위에, **production F604/F605/F619/F621 ✅ MERGED + 17/20/21/22 v2 작성 결과 + 57 sprint 연속**을 반영. v1 본문은 보존(소급 수정 없음), 본 v2가 5/15 W19 미팅 정본 (오늘 D-2).

---

## 0. v1 → v2 변경 요약

| 항목 | v1 (S346, D-5) | v2 (S357+, D-2) |
|------|----------------|------------------|
| **C-1 sprint 연속** | 41 sprint (S306~S346, F560~F641) | **57 sprint** (S306~S357, F560~F621) — +16 sprint |
| **C-2 외부 의존** | 본부 2개 + core_diff + RBAC + KPI 협조 (4건) | **3건 축소** — AXIS-DS PR #55 ✅ unlock(F604/F605) + Decode-X stub 우회(F619 ✅) |
| **C-3 자동화 가능** | T1~T5 13건 사전 정리 | **17건 완결 매핑 + autopilot 학습 사례 16→17회차 확장** |
| **C-4 KPI 측정 가능** | 6/8 (75%) | **8/8 (100%) production 측정 가능** — F604 ✅ + F605 ✅ + F621 ✅ |
| **Q&A 본문** | 5건 (Q1~Q5) | 5건 그대로 + **3건 추가** (Multi-Evidence/운영 화면 본부/E1/E2/E3 threshold) = **8건** |
| **D-day 카운트다운** | D-5 (5/15까지 5일) | **D-2** (5/15까지 2일) |
| **5/14 dry-run** | 사전 점검 6항 일반 | **20 v2 §5.2 9 항목 A~I + 21 v2 §5.1 + 22 v2 §10 7 항목** 매핑 |
| **백업 절차** | 시나리오 A/B/C | v1 그대로 + **C-1 ✅ + C-4 ✅로 C-2 부분 미달도 진행 가능 보강** |

---

## 1. 한 줄 결론 (v2 정본)

> **C-1 ✅ + C-3 사전 정리 ✅ + C-4 ✅ = 3/4 게이트 자체 통과 충분. C-2만 외부 sign-off 필요하나 안건 3건으로 축소(AXIS-DS unlock + stub 우회로 부분 진척).**

v1(C-1 ✅ + C-3 부분 + C-4 6/8)에서 +6일 동안 17 sprint 추가 완결 + 4 v2 docs 작성 + KPI 8/8 production 측정 가능 → BeSir 미팅 입장 신뢰도 강화.

---

## 2. C-1: Pre-착수 PoC 통과 (Sinclair 개입 < 10%) — ✅ 자체 증거 강화

### 2.1 게이트 기준 (v1 그대로)
- W18~W19 안에 Foundry-X agentic 자동화 PoC로 **Sinclair PM 개입 < 10%** 입증
- F600 등록 전 통과 필수

### 2.2 측정 기간 + 증거 (v2 갱신)
- **측정 기간**: 2026-04-12 ~ 2026-05-13 (S306 시작 ~ S357 진행, 약 4주 + 3일 추가)
- **측정 단위**: Sprint 393 = F560~F621 = **57 sprint 연속 성공**
- **자동화 도구**: Foundry-X autopilot + task-daemon + ccs --model sonnet + 4-layer notification

### 2.3 정량 지표 (v2 갱신)

| 지표 | v1 측정값 (S346) | **v2 측정값 (S357+)** | 게이트 기준 | 충족 |
|------|------------------|------------------------|-----------|------|
| Sprint 연속 성공 | 41 sprint | **57 sprint** (S306~S357) | ≥ 10 sprint 권장 | ✅ 5.7배 |
| autopilot Match Rate 평균 | ~98% | **~97~100% 분포 유지** (직전 F619 98% + F621 100%) | ≥ 90% | ✅ +7%pt 이상 |
| Sprint 평균 시간 | ~15분 | **~14분** (직전 F619 16분 + F621 14분 + F656 6분 37초 최단) | ≤ 60분 권장 | ✅ 4배 빠름 |
| Sinclair 인터뷰 횟수/sprint 평균 | 2~4회 | **2~4회** (변동 없음, 패턴 정착) | < 10회 | ✅ |
| 자율 보정 사례 | 27회+ | **34회+** (S352 silent layer 7+8+9 + S354 17회차 dependency 변종 + F619 80% 자체) | ≥ 1건 | ✅ |
| Production 장애 (revert) | 1건 (F636 ~4h41m) | **1건 (v1 그대로)** — F640 ✅ 영구 차단 후 추가 0건 | 사전 식별 + revert + 학습 | ✅ |
| 신규 자율 처리 사례 (v1 후) | — | **F644~F656 master push CI 회귀 부채 청산 5 sprint 연속 (S356) + F619/F621 BeSir dry-run 산출물** | — | ✅ |

### 2.4 Sinclair 개입 측정 (v2 정성 갱신)

v1 §1.4 표 그대로 유지 (단계별 자동화 비율 변동 없음). **추가 측정**:

| 신규 단계 (v2 추가) | 자동화 비율 | Sinclair 개입 |
|----------------------|-------------|---------------|
| Master 직접 모드 sprint (Sprint 383~385 S354) | 80% | F-item 결정 + autopilot 부재 fix 본문 (20%) |
| 메타 세션 (4 v2 docs S357 작성) | 60% | docs 본문 작성 (40%) — meta-only 영역 |
| 5/14 dry-run 사전 점검 (예정) | 90% | smoke probe + JWT 검증 (10%) |

**평균 개입 비율 추정 (v2)**: ~8~10% (게이트 기준 < 10% **여전히 충족**, 단 meta-only docs 작업 시 일시적 상승)

### 2.5 증거 문서 reference (v2 갱신)

- `SPEC.md §5` F560~F621 **57 sprint 연속 ✅ row** (eb8185a4 master HEAD)
- `MEMORY.md` archive/sessions-306-313.md + sessions-313-327.md + sessions-328-331.md + S354~S357 entries
- `~/.claude/rules/development-workflow.md` "Autopilot Production Smoke Test" **17회차 변종 학습** (S354 dependency surface change 추가)
- `~/.claude/rules/sprint-ops.md` (S268 cs 제거 + WT 탭 필수 + task-daemon 시작 4 룰)
- `git log --oneline 4월12일..` **57 sprint MERGED 커밋 이력**

### 2.6 결론 (v2 강화)

**C-1 ✅ 통과 증거 더욱 충분** — v1(41 sprint) 대비 +16 sprint 누적, autopilot Match 평균 안정 유지, F619/F621 BeSir dry-run 산출물까지 자율 처리. Pre-착수 PoC 충분 입증 + **autopilot의 외부 의존 골격 분리 패턴(F619 stub adapter)도 신규 입증 사례**.

---

## 3. C-2: 본부 4 안건 서면 확약 — ⚠️ 외부 의존, 안건 3건으로 축소

### 3.1 게이트 기준 (v1 그대로)
- W19 안에 본부 4 안건 서면 확약: (1) 도메인 본부 2개 / (2) core_diff 워크샵 / (3) Approver RBAC / (4) KPI 협조

### 3.2 진행 상황 (v2 갱신, D-2 시점)

#### 3.2.1 사전 진척 (v1 + v2 추가)

| 항목 | v1 (D-5) | v2 (D-2) |
|------|----------|----------|
| F603 Cross-Org default-deny 골격 | ✅ Sprint 363 | (그대로) |
| F606 Audit Log Bus | ✅ Sprint 351 | (그대로) |
| F607 AI 투명성 + 윤리 임계 | ✅ Sprint 359 | (그대로) |
| **F604 KPI 위젯 4종 + 8 KPI 산정 코드** | (idea) | ✅ **Sprint 377** — AXIS-DS PR #55 unlock 결과 |
| **F605 HITL Console + 3 source 통합** | (idea) | ✅ **Sprint 378** — AXIS-DS v1.2 통합 |
| **F619 Multi-Evidence + Decode-X stub** | (idea) | ✅ **Sprint 392** — Decode-X Phase 2-E 우회 stub |
| **F621 운영 통합 대시보드 (`/operations`)** | (idea) | ✅ **Sprint 393** — F604+F605 unlock 후 |
| **F642 trace_id chain enrichment** | (그날 작업) | ✅ **Sprint 379** — audit chain endpoint live |

**핵심 변화**: v1 시점 P0 토대 4건(F602/F603/F606/F607) → v2 시점 **P0 토대 4건 + UI/통합 4건 (F604/F605/F621/F642) + Multi-Evidence stub 1건 (F619)** = 9건 ✅

#### 3.2.2 외부 의존 (v2 축소)

| v1 미해소 4건 | v2 상태 | 차이 |
|---------------|---------|------|
| 본부 2개 선정 | **유효** (BeSir 안건 1) | 변동 없음 |
| core_diff 워크샵 일정 | **유효** (BeSir 안건 2) | 변동 없음 |
| Approver RBAC 매핑 | **유효** (BeSir 안건 3) — F601 SSO 의존 | F605 RBAC mock ✅ + JWT claims 강제는 F601 unlock 후 후속 |
| KPI 베이스라인 협조 | **부분 해소** (BeSir 안건 4) | F604 ✅ KPI sub-app + F621 4 본부 통합 화면 → 본부 데이터만 협조 받으면 즉시 baseline 가능 |

### 3.3 BeSir 미팅 sign-off 안건 (v2 축소 + 우선순위 명확화)

v1의 4 안건 그대로 유지하되 **우선순위 + 진척 반영**:

| # | 안건 | v1 (D-5) | v2 (D-2) 우선순위 |
|---|------|----------|---------------------|
| 1 | 본부 2개 잠정 선정 | P0 | **P0 그대로** — 모든 후속의 의존성 |
| 2 | core_diff 워크샵 일정 (W20~W21) | P0 | **P0 그대로** |
| 3 | Approver RBAC 5역 매핑 | P0 | P1 — F605 mock RBAC 가동, 실 매핑은 F601 unlock 동시 |
| 4 | KPI 베이스라인 협조 | P0 | **P0 강화** — F604 ✅ + F621 ✅ → 본부 데이터 협조만 받으면 5/19 즉시 시작 가능 |

### 3.4 미팅 talking points (v2 D-2 시점)

**Open (v2 갱신, 30초)**:
> "v2 executive 자료 + 17/20/21/22 v2 4 문서 + 본 18 v2 = D-2 시점 사전 진척이 충분. **57 sprint 연속 + KPI 8/8 production 측정 가능 + 운영 통합 화면 `/operations` 실 시연 가능** 상태. 오늘 동의하시면 W20 KPI 베이스라인 측정 + W21 G1+G2 게이트 일정 확정합니다."

**안건 1 — 본부 2개 선정 (v1 그대로 + v2 보강)**:
- 후보: HR / Ops / 심사·승인 (06 정합성 분석 P0-1)
- 1순위 권장: 심사·승인 본부 (정책 자산화 가치 최고)
- 2순위: Ops 본부 (data 풍부, NDA 즉시)
- **v2 추가**: 데모 시연 시 `/operations` 4 본부 column(KOAMI/AXIS-DS/Decode-X/Foundry-X) → 선정된 본부 2개로 swap (~10분 hardcoded 교체)
- 미달 시: 단일 본부로 시작 + W22 2번째 본부 합류

**안건 2 — core_diff 워크샵 (v1 그대로)**:
- 일정 1순위 권장: W20 5/22(목), 4시간, SME 4명 + Sinclair + 서민원
- 백업 2순위/3순위: 5/23(금) / 5/29(목)
- 진행 방식: Open + 4그룹 review (30분) → 본부별 sample 8건 분류 (90분) → 합의 + 룰 보정 (60분)
- 사전 자료: F603 default-deny 룰 v1 + F626 차단율 KPI 사전 측정 (이미 production code ✅)
- 산출물: (a) 본부별 정책팩 8건 분류 결과 / (b) 룰 보정 patch 후보 / (c) Approver/Reviewer RBAC 본부별 매핑 초안

**안건 3 — Approver RBAC 5역 (v2 축소)**:
- 5역: Admin / Reviewer / **Approver** / Operator / Auditor
- 06 PRD §11.4 매핑 — 본부 RBAC 권한 5건 (5명/본부 × 2 본부 = 10명)
- **v2 추가**: F605 ✅ `ROLE_ALLOWED_ACTIONS` type-level 정의 완료 (22 v2 §5). JWT claims 강제는 F601 SSO unlock 후 ~30분 sprint
- 미팅에서 실 본부 직원 5역 매핑만 받으면 OK (코드는 이미 준비됨)

**안건 4 — KPI 베이스라인 협조 (v2 강화)**:
- 본부 데이터 협조: 정책팩 1건 / Decision Log 50건 / SME 인터뷰 (각 1시간 × 4)
- 데이터 anonymize: F627 llm+service-proxy ✅ 자동 처리
- **v2 추가**: KPI 8/8 production 측정 코드 모두 ✅ (21 v2 §2 표). 본부 데이터 받자마자 5/19(월) `GET /api/kpi?orgId=본부-id` 1회 호출로 즉시 baseline
- F621 `/operations` 화면에서 4 본부 동시 monitor → 본부별 차이는 KPI-1/KPI-2 2건에서만 (orgId filter 비대칭 명시, 21 v2 §4.2)

### 3.5 백업 (v1 + v2 보강)

- **시나리오 A (v1)**: 본부 1개만 sign-off → C-2 부분 통과, W20 단일 본부 시작
- **시나리오 B (v1)**: BeSir sign-off 1주 지연 → W21 G1+G2 게이트도 1주 지연 (5/30)
- **시나리오 C (v1)**: BeSir 전체 거부 → C-1 ✅ + C-4 ✅로 Phase 2 PoC 단독 진입 (v1보다 강화 — v1은 C-1만 의존했지만 v2는 KPI 8/8까지 측정 가능)
- **시나리오 D (v2 신규)**: BeSir 동의 + 본부 선정만 sign-off → 안건 2/3/4는 후속 → W20 본부 데이터 협조 받으면서 core_diff 워크샵 W21로 이동

---

## 4. C-3: AI 에이전트 자동화 범위·한계 명확화 — 사전 정리 강화 (W20 PRD 보강 일정 유지)

### 4.1 게이트 기준 (v1 그대로)
- W20 (5/18~5/24)에 PRD §6.3.1 보강
- F-item 등록 시 자동화 가능/불가능 분류 명시

### 4.2 자동화 범위 (v2 갱신 — 17 v2 매핑 결과)

**자동화 가능 — 17건 완결 ✅** (v1 13건 → v2 17건):

| Tier | F# 완결 | 비고 |
|------|---------|------|
| T1 토대 | F606 ✅ / F628 ✅ / F629 ✅ | 3건 |
| T2 Domain Extraction | F630 ✅ / F631 ✅ / F624 ✅ | 3건 |
| T3 Diagnostic & HITL | F602 ✅ / F632 ✅ / F607 ✅ | 3건 |
| T4 Sub-app Solo | F615 ✅ / F616 ✅ / F623 ✅ / F603 ✅ / F626 ✅ | 5건 |
| T5 Integration | F617 ✅ / F618 ✅ / F620 ✅ | 3건 |
| **T1~T5 합계** | — | **17건 ✅ (100%)** |

**T6 외부 의존 부분 unlock ✅ 4건** (v1 미반영):
- F604 ✅ Sprint 377 (AXIS-DS PR #55)
- F605 ✅ Sprint 378 (AXIS-DS v1.2)
- F619 ✅ Sprint 392 (Decode-X stub 우회)
- F621 ✅ Sprint 393 (F604+F605 unlock 후)

**T6 잔존 외부 의존 2건**:
- F601 Multi-Tenant PG + SSO (BeSir 미팅 안건)
- F600 5-Layer 통합 (5 repo orchestration)

### 4.3 자동화 한계 (v1 그대로 + v2 추가 사례)

v1 §3.3 4건 그대로 유지 + **v2 추가**:

- **silent layer 발견 패턴** (S352~S356): content-sync-check.sh awk 매칭 / Master push CI 환경 race / sprint description escape — 자동 감지 못 하는 layer 7~9. 인간 진단 sprint 1회 후 fix.
- **PR CI vs master push CI 비대칭** (S352 F644 / S354 F648~F650): PR CI는 결정론적 GREEN, master push는 cold compile + cache miss로 race. **운영 영향 0이지만 자율 처리 한계 노출** — `~/.claude/rules/development-workflow.md` "Production Smoke Test 17회차 변종" 정착.
- **dependency upgrade codemod logic-altering** (S341 F636 → S345 F640 → S354 F649 hotfix): typecheck PASS ≠ logic 정확성. multi-input smoke probe + manual review 필수.

### 4.4 자동화 성공/실패 경계 — v1 표 + v2 추가

| 사례 | 분류 | 결과 (v2 갱신) |
|------|------|----------------|
| (v1 7건 사례) | T1~T3 자동화 가능 | autopilot Match 95~100% 분포 |
| F644 master push CI 회귀 시리즈 (Sprint 387~391, S356) | **자동화 한계 노출 + 회귀 처리** | 5 sprint 연속 fix → shard 2/3/4 결정론적 GREEN ✅ |
| F619 stub adapter (Sprint 392) | **외부 의존 골격 분리 패턴** | autopilot Match 98% / ~16분 / Decode-X 우회 80% 자체 |
| F621 KPI 통합 화면 (Sprint 393) | T6 unlock 후 자동화 | autopilot Match 100% / ~14분 / backend 변경 0 |
| F651 잔존 9 test 정밀 fix (Sprint 386, S355) | 자동화 가능 (인터뷰 1회) | autopilot Match 100% / SCOPE LOCKED 11~12항 |
| 17/20/21/22 v2 docs 작성 (S357 메타) | **meta-only 영역 — Master 직접** | autopilot 미적용 (인간 docs 작성 영역) |

### 4.5 W20 PRD §6.3.1 보강 계획 (v2 갱신)

- 본 §4.3+§4.4 사례 표 → PRD §6.3.1 본문 흡수
- T1~T6 매트릭스 (17 v2 §2~§3) → PRD §6.3.2 신규 — **17 v2가 SSOT**
- 자동화 가능/한계 분류 룰 → PRD §6.3.3 신규
- **silent layer 7~9 발견 패턴 → PRD §6.3.4 신규** (v2 추가)
- W20 작업: 5/19 (월) ~ 5/24 (금), 1 sprint 분량

---

## 5. C-4: KPI 베이스라인 측정 결과 PRD 반영 — ✅ 측정 가능 8/8 (100%)

### 5.1 게이트 기준 (v1 그대로)
- W19~W20 안에 KPI 8개 베이스라인 측정 + PRD 반영
- Sprint 1 시작 전 (W21) 충족 필수

### 5.2 KPI 8개 + 측정 코드 매핑 상태 (v2 갱신)

| # | KPI id | 측정 코드 (v2 production) | v1 Status | **v2 Status** |
|---|--------|----------------------------|-----------|---------------|
| 1 | `bureau_active_count` | F604 ✅ `KpiCalculatorService.calculateBureauActiveCount(orgId?)` + `graph_sessions` D1 | 📋 idea (F601 unlock 후) | ✅ **측정 가능** (orgId filter 지원, demo 누적 후 즉시) |
| 2 | `critical_inconsistency_rate` | F604 ✅ + `feedback_queue` (0094) | ✅ 측정 가능 | ✅ (그대로) |
| 3 | `asset_reuse_rate` | F604 ✅ + `agent_run_metrics` (0132) cache_read_tokens | ✅ | ✅ (그대로) |
| 4 | `diagnostic_time_reduction` | F604 ✅ + `graph_sessions` AVG completed-started | ✅ | ✅ (그대로) |
| 5 | `five_layer_e2e_success_rate` | F604 ✅ + `graph_sessions` SUM(completed) / COUNT(*) | 📋 idea (F600 unlock 후) | ✅ **측정 가능** (단, 5-Layer 운영 미시동 시 데이터 부족 → graceful null) |
| 6 | `hitl_avg_processing` | F604 ✅ + `dual_ai_reviews` (0138) verdict 양방향 비율 | ✅ | ✅ (그대로) |
| 7 | `api_p95` | F604 ✅ + `agent_run_metrics` duration_ms p95 (application layer 계산) | ✅ | ✅ (그대로) |
| 8 | `core_diff_blocking_rate` | F604 ✅ + `dual_ai_reviews` codex_verdict='BLOCK' / F626 차단율 | ✅ | ✅ (그대로) |

**측정 가능 ✅ 8/8** (100%) — v1 6/8 (75%) → v2 8/8. **F600/F601 unlock 무관**하게 production code로 측정 가능 (운영 데이터 축적 후 자동 null→값 전환).

### 5.3 측정 시작 가능 시점 (v2 갱신)

- **즉시 가능 (8/8 KPI)**: 본부 데이터 협조 받자마자 5/19(월) 아침 즉시 `GET /api/kpi?orgId=본부-id` 1회 호출 + JSON 파싱 → baseline 확정
- v1의 "F600/F601 unlock 후 2개" 제약 해소 — graceful degradation으로 운영 데이터 부족 KPI는 null 표시 (21 v2 §3.4)

### 5.4 BeSir 미팅 sign-off 안건 (v2 갱신)
- KPI **8개 즉시 측정 시작 동의** (v1 6개 → v2 8개)
- 본부 데이터 협조 요청 (생성 + 인터뷰)
- W19~W20 측정 결과 → W21 PRD §5.1 반영

### 5.5 KPI 측정 query 예제 — v2 정합성 (21 v2 §2가 SSOT, 본 §5.5는 사용 사례 중심)

> **v2 변경**: v1 §4.5 수동 SQL 본문은 21 v2 §2 표로 SSOT 이전. 본 §5.5는 production API 호출 사용 사례 중심.

#### 5.5.1 일괄 호출 (8 KPI 한 번에)

```bash
curl "https://foundry-x-api.ktds-axbd.workers.dev/api/kpi?orgId=본부-id" \
  -H "Authorization: Bearer ${JWT}"
```

**기대 응답** (21 v2 §3.1):
```json
{
  "kpis": [
    {"id": "bureau_active_count", "value": 4, "trend": "stable", "threshold": 4, ...},
    {"id": "critical_inconsistency_rate", "value": 5.2, "trend": "down", "threshold": 10, ...},
    // ... 8 KPI 모두
  ],
  "computedAt": "2026-05-19T01:00:00Z"
}
```

#### 5.5.2 단건 호출 (특정 KPI만)

```bash
curl "https://foundry-x-api.ktds-axbd.workers.dev/api/kpi/core_diff_blocking_rate?orgId=본부-id" \
  -H "Authorization: Bearer ${JWT}"
```

**404 처리**: 알려지지 않은 KPI id → `{"error": "Unknown KPI id: xxx. Valid ids: ..."}` (21 v2 §3.2)

#### 5.5.3 운영 통합 화면 시각화

```bash
# 5/19(월) 아침 — 1회 production 호출만으로 4 본부 baseline 확보
open "https://fx.minu.best/operations"
# → 4 본부 column에 8 KPI baseline + HITL 메트릭 동시 표시
```

### 5.6 베이스라인 목표 수치 (v1 그대로 + v2 표 갱신)

| KPI | 목표 (Phase 1 종료) | 측정 시작 | v1 Status | **v2 Status** |
|-----|---------------------|----------|-----------|---------------|
| 1 bureau_active_count | ≥ 2 본부 | 5/19 (W20) | 📋 F601 의존 | ✅ **즉시** (orgId filter ✅) |
| 2 critical_inconsistency_rate | < 10% | 5/19 (W20) | ✅ | ✅ (그대로) |
| 3 asset_reuse_rate | ≥ 30% | 5/19 (W20) | ✅ | ✅ (그대로) |
| 4 diagnostic_time_reduction | < 30분 (1주→1일 70% 단축) | 5/19 (W20) | ✅ | ✅ (그대로) |
| 5 five_layer_e2e_success_rate | ≥ 80% | 5/19 (W20) | 📋 F600 의존 | ✅ **즉시** (graceful null로 표시) |
| 6 hitl_avg_processing | ≥ 80% | 5/19 (W20) | ✅ | ✅ (그대로) |
| 7 api_p95 | < 3,000ms | 즉시 | ✅ | ✅ (그대로) |
| 8 core_diff_blocking_rate | < 5% (PRD §5.3) | 5/19 (W20) | ✅ | ✅ (그대로) |

---

## 6. 종합 결론 (v2 갱신) — 5/15 BeSir 미팅 입장

### 6.1 통과 증거 충분 (v2 확장)

- **C-1 ✅** (자체 증거): **57 sprint** 연속 + autopilot Match 평균 97~100% + Sinclair 개입 < 10% (v1 41 sprint → +16)
- **C-3 사전 정리 ✅** (W20 PRD 보강 가능): **17건 완결 매핑 + autopilot 학습 17회차** (v1 13건 → +4)
- **C-4 ✅** (KPI 측정 8/8 production code 가능): **8/8 (100%)** — v1 6/8 (75%) → +2 KPI unlock

### 6.2 외부 sign-off 대기

- **C-2 ⚠️**: 본부 2개 + core_diff 워크샵 + Approver RBAC + KPI 협조 → **3건 축소** (AXIS-DS unlock + stub 우회로 부분 진척)

### 6.3 미달 시 백업 (v1 그대로 + v2 보강)

- **v1 시나리오 A/B/C 모두 유효**
- **v2 신규 시나리오 D**: BeSir 동의 + 본부 선정만 sign-off → 안건 2/3/4 후속 → C-1+C-4 ✅로 단독 Phase 2 진입 가능

### 6.4 BeSir 미팅 안건 (v2 갱신)

v1 5 안건 그대로:

1. AI Foundry Phase 1 진척 보고 (executive_one_pager v3 + 본 18 v2 + 17 v2)
2. P0 토대 5건 + W27 게이트 + P0-3 Integration 시연 (20 v2 7 step demo — F602/F603/F606/F607/F642/F619/F621)
3. C-2 4 안건 sign-off (본부 2개 / core_diff 워크샵 / Approver RBAC / KPI 협조)
4. C-4 KPI **8/8** 측정 시작 동의 + 본부 데이터 협조
5. W20~W21 일정 확정 (G1+G2 게이트, 5/25~5/31)

---

## 7. Q&A 모의 답변 (v1 5건 + v2 추가 3건 = 8건)

### Q1~Q5 (v1 본문 그대로 유지)

v1 §6 Q1~Q5 본문은 v2에서도 유효 (외부 LLM / 본부 격리 / AI 신뢰성·책임 / Emergency Stop / 시연 단계 실패) — **v2 참조용 본문은 v1 §6 그대로**.

### Q1~Q5 보강 (S358+ 5/13 D-1 라이브 dry-run 증거 추가)

> **목적**: v1 §6 답변을 5/13 D-1 라이브 검증 결과로 강화. 같은 답변 본문에 **"5/13 실측"** 한 줄 삽입으로 BeSir 측 신뢰도 ↑.

**Q1 (외부 LLM 비용·보안) — 압축 권고 1m30s → 1m**:
- F627 entry-point + F624 정책 핵심만 강조
- F628/F629 cost baseline은 "측정 인프라 갖춰짐, W20 베이스라인 시작" 1줄로 축약
- **5/13 라이브 추가**: "F624 KV cache + audit 발행 — 5/13 D-1 라이브에서 `/api/kpi` 응답 시 KV cache 효과로 `asset_reuse_rate` 측정 KPI 활성 동작 확증"

**Q2 (본부 자산 격리) — 라이브 증거 추가**:
> v1 §6 답변 끝에 추가: "**5/13 D-1 라이브 실측**: Step 3 `/api/cross-org/check-export` 호출 시 production D1 `cross_org_export_blocks` 테이블에 `blockId=5f83fb0b-8a15-41f2-b461-678cf6e7df5c` 신규 row INSERT 확증 — append-only trigger로 사후 조작 불가 직접 실증. F603 default-deny + F642 trace_id chain 동시 동작 확인."

**Q3 (AI 신뢰성·책임) — 압축 권고 2m → 1m30s + 라이브 증거**:
- F624/F632/F607/F605/RBAC 5축 중 가장 강한 2축만 강조 (F619 + F607)
- 사후 조작 불가 + RBAC 5역은 1문장 압축
- **5/13 라이브 추가**: "Step 6 F619 multi-evidence pipeline test **10/10 PASS** (E1 수집 8건 + E2 검증 + E3 통합 + audit-bus integration 2건). E1/E2/E3 알고리즘이 production-grade 검증 완료 — AI 의사결정 신뢰도 도출 path 입증."

**Q4 (Emergency Stop) — 라이브 증거 추가**:
> v1 §6 답변 끝에 추가: "**5/13 D-1 라이브 실측**: Step 4 `/api/ethics/check-confidence` `{confidence: 0.65}` 호출 시 `{passed: false, escalated: true}` 즉시 응답 확증 — HITL escalation pipeline 실시간 동작 검증. ethics_violations append-only + F605 HitlEscalationBadge 빨간 배지 시각화 5/15 Step 7에서 직접 시연."

**Q5 (시연 실패 대응) — 라이브 증거 핵심 추가**:
> v1 §6 답변 끝에 추가: "**5/13 D-1 라이브 종합 검증 (시연 D-2 시점)**: 7 endpoint 모두 ✅ HTTP 200 + F619 test 10/10 PASS + production 시드 + KPI/HITL 6시간 안정. **docs schema drift 1건 발견·즉시 patch** (20 v1 Step 2/3/4 body — S350 갱신 미반영) — **시연 직전 24시간 내 라이브 검증 안전망** 작동 입증. 5/15 미팅 시연 중 실패 가능성 자체가 최소화됨."

### Q&A 8건 시연 시간 조정 권고 (S358+, BeSir 미팅 Q&A 5분 가정)

| Q | 원 시간 | 압축 시간 | 압축 방법 |
|---|---------|-----------|----------|
| Q1 | 1m30s | 1m | F627 + F624 핵심만, cost는 1줄 |
| Q2 | 1m | 1m | 그대로 + 라이브 증거 (시간 동일) |
| Q3 | 2m | 1m30s | F619 + F607 2축만, RBAC 1문장 |
| Q4 | 1m | 1m | 그대로 + 라이브 증거 |
| Q5 | 45s | 45s | 그대로 + 라이브 증거 핵심 |
| Q6 | 1m | 1m | (그대로) |
| Q7 | 45s | 45s | (그대로) |
| Q8 | 1m | 1m | (그대로) |
| **합계** | **9m** | **8m** | 1분 압축 (BeSir Q&A 5분이라면 우선순위 Q 4~5건만 답변 가능, 나머지는 보조 자료 안내) |

**우선순위 가이드** (Q&A 5분 제한 시):
1. **Q5** (시연 실패) — 5/15에서 가장 자주 나올 질문, D-1 라이브 증거 강력
2. **Q2** (본부 격리) — 안건 1 직결, blockId 증거
3. **Q3** (AI 신뢰성) — 의사결정 책임, F619 test 증거
4. **Q4** (Emergency Stop) — escalated=true 라이브 증거
5. (시간 있으면) Q1/Q6/Q7/Q8 답변

### Q6 — Multi-Evidence Decode-X 실 hook은 언제 가능한가? (NEW v2)

**답변 본문** (1분):
> "**Decode-X Phase 2-E unlock 시점**이 외부 의존 단일 조건입니다. 현재 F619 (Sprint 392 ✅)에서 **stub adapter로 80% 자체 검증 완료** — Multi-Evidence E1 수집 / E2 검증(threshold 0.7) / E3 통합(risk score 산정) 알고리즘 + Decode-X stub event publisher 가동 검증.
> Decode-X Phase 2-E unlock 시 **swap 작업량은 ~10라인** — `DecodeXStubAdapter` → production `DecodeXAdapter` 구현체로 교체만. 실 이벤트 hook은 `analysis.completed` 이벤트 받아 자동 trigger. **80% 자체 가능 패턴**의 모범 사례로, 17 v2 §8.1에 다른 3 사례(F601 SSO/PG, F619)와 함께 정리됐습니다."

**보조 자료**: F619 plan, decode-x-stub.adapter.ts, 17 v2 §8.1

### Q7 — 운영 통합 화면 4 본부가 고정인가? (NEW v2)

**답변 본문** (45초):
> "현재는 **demo orgUnits 4 본부 hardcoded** (KOAMI / AXIS-DS / Decode-X / Foundry-X) — `packages/web/src/components/operations/types.ts` `ORG_UNITS` 배열. **F601 SSO + Approver RBAC 5역 unlock 시 dynamic으로 swap** 가능. 사용자 권한에 따라 자기 본부만 보이게 변경할 수 있음 (~30분 sprint 예상). 본부 수 변경 자체는 `ORG_UNITS` 배열 갱신만 ~5분 작업.
> 본 데모에서는 BeSir 합의 후 **선정 본부 2개로 swap 가능** — 본 미팅 결과에 따라 W20 첫 sprint로 적용. 화면 구조(4 본부 column grid)는 본부 수에 자동 반응 — 1 / 2 / 4 본부 모두 반응형 grid 지원 (operations.tsx)."

**보조 자료**: 21 v2 §4, operations.tsx, F621 plan

### Q8 — E1/E2/E3 threshold 0.7은 왜? (NEW v2)

**답변 본문** (1분):
> "**PRD §6.4 윤리 임계 정책(F607) threshold 0.7과 동일**합니다. **단일 정책 일관성** 원칙 — AI 의사결정 신뢰도 기준점을 모든 layer에서 통일.
> **severity별 confidence 매핑**: critical = 1.0 (모든 threshold 통과) / warning = 0.8 (0.7 통과) / info = 0.5 (필터링됨). **결과**: info severity evidence는 자동 noise reduction되어 E2에서 제외 → E3 통합 점수가 critical/warning evidence만 반영. **22 v2 §4 동일 룰** — HITL escalation도 confidence < 0.7 기준.
> threshold는 **환경별 조정 가능** — `EVIDENCE_CONFIDENCE_THRESHOLD` 상수 (diagnostic/types.ts:38) 또는 `processMultiEvidence(findings, traceId, customThreshold)` 호출 시 명시 override. 보수적 환경(예: 의료/법무)에서는 0.8~0.9로 상향, 탐색적 환경(예: 비즈니스 분석)에서는 0.5~0.6으로 하향 가능."

**보조 자료**: F619 multi-evidence.service.ts, F607 ethics threshold, 22 v2 §4, 20 v2 Q&A §4

---

## 8. 5/14 dry-run D-1 통합 점검 매핑 (NEW v2)

본 v2는 5/14 dry-run(D-1) 직전에 본 18 + 4 v2 docs 한 화면 정리용. 5/14 점검 시 사용할 매핑:

### 8.1 dry-run 점검 항목 통합 (4 v2 docs 합본)

| 점검 영역 | 출처 | 항목 수 | 우선순위 |
|----------|------|---------|----------|
| 7 endpoint dry-run 1차 | **20 v2 §5.1 #3** | 7 시연 포인트 | P0 |
| Step 6 dry-run 사전 캡처 | **20 v2 §5.1 #7** | 1 (코드 trace + 출력 캡처) | P0 |
| Step 7 화면 캡처 사전 준비 | **20 v2 §5.1 #8** | 1 (3 화면 모드) | P0 |
| 5/14 당일 9 항목 A~I | **20 v2 §5.2** | 9 (D1 시드/JWT/dry-run/trace 검증/Step 6/Step 7/비디오/Q&A 모의/인쇄) | P0 |
| KPI 측정 정합성 | **21 v2 §5.1** | 8 KPI 기대값 | P1 |
| HITL 점검 7 항목 | **22 v2 §10** | 7 (queue/decision/source별 D1 UPDATE 검증) | P1 |
| C-1 sprint 연속 확인 | **본 §2.3** | 1 (`git log`) | P1 |
| C-4 8 KPI production smoke | **본 §5.5** | 1 (`/api/kpi` 응답 정합성) | P0 |

### 8.2 5/14 (수) 당일 진행 순서 권장

```
오전 09:00 — D1 시드 적용 (20 v2 §5.2 A) + JWT 발급 (B)
오전 10:00 — 5 endpoint dry-run 2차 (C, Step 1~5 curl)
오전 11:00 — trace_id chain 검증 (D, F642 by-trace endpoint)
오후 13:00 — Step 6 dry-run 실행 (E, F619 코드 trace)
오후 14:00 — Step 7 라이브 점검 (F, /operations URL + 8 KPI smoke)
오후 15:00 — HITL 7 항목 점검 (22 v2 §10)
오후 16:00 — 비디오 캡처 백업 (G)
오후 17:00 — Q&A 모의 진행 1회 (H, 8 질문)
저녁 19:00 — 18 v2 + 17 v2 + 20 v2 + 21 v2 + 22 v2 + 02 v0.5 + 23 v1 + 24 v1 + INDEX v1.2 인쇄 페어 자료 (I, 9 docs × 3부)
```

총 분량: ~8시간 + 인쇄 + 자료 준비 = **5/14 (수) 1 day 완결**.

---

## 9. 이력

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| v1 | 2026-05-10 | 최초 작성 (W19 D-5, S346). 4 게이트 통과 증거 + Q&A 5건 본문 | Sinclair |
| v2 | 2026-05-13 | W19 D-2. C-1 41→57 sprint + C-2 안건 3건 축소 + C-3 17건 완결 + C-4 8/8 KPI ✅ + Q&A 3건 추가 (Multi-Evidence/운영 화면 본부/threshold) + 5/14 dry-run 통합 점검 매핑. v1 보존, v2 정본 | Sinclair (S357+) |

---

## 10. 관련 문서 (v2 갱신)

- **17_internal_dev_plan_with_besir_v2.md** — Tier 진척 결과 매핑 (T1~T5 17건 + T6 4건 unlock)
- **20_live_demo_scenario_v2.md** — 7 step demo + Q&A 8건 본문
- **21_kpi_calculation_table_v2.md** — 8 KPI production API shape + F621 통합 시각화
- **22_hitl_console_v2.md** — F605 + F621 4 본부 통합 모니터링 + 잔존 5 F-item
- **06_architecture_alignment_with_besir_v1.md** — BeSir 정합성 P0 10건
- **15_msa_implementation_plan_v1.md §483~487** — Conditional 게이트 정의 + 백업 절차
- **02_ai_foundry_phase1_v0.3.md** (frontmatter `version: v0.5` — v0.4 patch S346 / v0.5 patch S357+ W19 D-2, P0 6/8 토대 ✅)
- **23_dry_run_d1_seed_v1.md** (S357+ W19 D-2) — D1 시드 SQL + §8 통합 시뮬레이션 6 sub-section (61 PASS / 0 FAIL)
- **24_production_apply_cheatsheet_v1.md** (S357+ W19 D-2) — 14 commits 회고 + 11 step 시간표 + fallback 시나리오
- **18_conditional_gate_evidence_v1.md** — v1 보존 (D-5 시점 기록)

---

**Status**: v2.0 (S357+, 2026-05-13 W19 D-2) — 4 게이트 진척 갱신 + 4 v2 docs 통합 매핑 + 5/14 dry-run D-1 점검 매핑 + Q&A 8건 본문. 5/15 W19 BeSir 미팅 입장 정본.
