---
title: AI Foundry Master Plan — Index
version: v1.1
date: 2026-05-10
owner: Sinclair Seo
status: v1.1 patch — Foundry-X 24h 드리프트 해소 (S332→S346) + W19 D-5 진입 + P0-3/P0-4/P0-7/P0-8 토대 ✅
classification: 기업비밀II급 / Enterprise부문
---

# AI Foundry Master Plan — Index

> 폴더 정리: 2026-05-05 (S332). 한글 폴더명 `기업 의사결정 업무 Agentic AI 플랫폼` → `ai-foundry-master-plan`.
> Secrets `.dev.vars` → `~/work/axbd/.secrets/ai-foundry/.dev.vars` (외부 안전 위치, 600 권한).
> **v1.1 patch (S346, 2026-05-10)**: §2 Foundry-X 진척 갱신 (Sprint 341 → Sprint 376, +35 sprint) + §5 P0 충족률 4건 갱신 (P0-3 45%→100% / P0-4 0%→골격 100% / P0-7 25%→100% / P0-8 50%→토대 100%) + §7 W18→W19 D-5 + §8 누락 발견 4건 부분 해소 + §9 SPEC.md 매핑 4건 ✅ + §10 다음 액션 W19 갱신.

## 1. 한 줄 정의

**AI Foundry는 기업의 의사결정을 자산으로 만드는 Agentic AI 플랫폼.** Policy Pack · Ontology · Skill Package · Decision Log 4-Asset 모델로 의사결정의 근거·맥락·반복가능성을 영구 자산화.

## 2. 5 repo 구성 (KTDS-AXBD org)

| Repo | 역할 | Plane | 현재 상태 |
|------|------|-------|----------|
| **Foundry-X** | Control Plane 후보 | 5-Layer 통합 운영 + Multi-Tenant + 4대 진단 + Cross-Org + KPI/HITL/Audit | Phase 47 / Sprint 376 ✅ / v1.9.x / 15 packages / **41 sprint 연속 성공** (S306~S346) — F560~F641, P0-3/P0-4/P0-7/P0-8 토대 ✅ |
| Decode-X | Input Plane | SI 프로젝트 역공학 엔진 (퇴직연금 + 온누리상품권 Pilot) | v0.7.0 / 7 Workers / 5 D1 / Phase 2-E 머지, 도메인 실측 부재 |
| Discovery-X | 발굴 | 사업 발굴 + BC 카드 export | v0.x / 47일 정체 ★ |
| AXIS-DS | Design System | KPI 위젯 + HITL Console + agentic-ui | v1.x / 93일 정체 ★ / PR #55 14일 미머지 |
| ax-plugin | Skill Marketplace | /ax:* 24 스킬 + 신규 5 스킬 후보 | 활성 (2026-05-04 Phase 5d 자동화 추가) |

## 3. 3 Phase 로드맵

| Phase | 기간 | 본질 | 종료 시 산출물 |
|-------|------|------|----------------|
| Phase 1 | ~2026-05-31 | 기획 확정 — AI Foundry 정의서 + 5-Layer 모듈 스펙 | 본 문서 v1.0 + 모듈 스펙 v1.0 |
| Phase 2 | 2026-06-01 ~ 2026-06-30 | Prototype — 가상 도메인 1개 5-Layer E2E | 시연 빌드 + 영상 + 측정 결과 |
| Phase 3 | 2026-08-01 ~ | 실제 사업 적용 — 첫 도메인 인스턴스화 + 운영 | 도메인 정책팩 v1.0 + GTM 1차 |

W18(현재) → W19 BeSir 미팅 + Conditional 게이트 → W20~W22 Foundry-X 5 sub-app 스캐폴드 → W26 5-Layer 통합 → W29 Phase 3 진입 정비.

## 4. 문서 Navigation (16건)

### 마스터 기획 (활성)
- **02_ai_foundry_phase1_v0.3.md** — Phase 1 정의서 (BeSir 정합성 P0 10건 + **v0.4 patch S346**) ★ SSOT
- **07_ai_foundry_os_target_architecture.md** — Target Architecture (5-Layer + 4-Asset)
- **08_build_plan_v1.md** — 마스터 빌드 플랜 (W18~W29 12주 매핑)

### Sub-App Dev Plan (W20~W26 구현 베이스)
- **09_dev_plan_guard_x_v1.md** — Guard-X (Policy 평가 + default-deny + PII Mask)
- **10_dev_plan_launch_x_v1.md** — Launch-X (정책팩 zip 패키징 + canary + rollback < 30s)
- **11_dev_plan_diagnostic_v1.md** — 4대 진단 (missing/duplicate/overspec/inconsistency)
- **12_dev_plan_cross_org_v1.md** — Cross-Org 4그룹 분류 + core_differentiator default-deny

### Live Audit + Implementation (2026-05-04)
- **14_repo_status_audit_v1.md** — 5 repo 라이브 정밀 분석 (PRD P0 평균 25% 충족, Foundry-X P0-4 0%)
- **15_msa_implementation_plan_v1.md** ★ — 5 sub-app + 3 횡단 레이어 + W18~W29 통합 sprint 매핑
- **16_validation_report_v1.md** — 14·15 검증 + v1.1 patch 권고 10건

### 검토 + 임원 보고
- **03_cross_review_prompts.md / 04_cross_review_consolidation_v1.md** — 외부 LLM 교차 검토 프롬프트 + 통합본
- **05_executive_one_pager_v1/v2/v3.md** — 임원 1페이지 (v3 = S346 W19 D-5 BeSir 사전 자료)
- **06_architecture_alignment_with_besir_v1.md** — BeSir 정합성 분석 (P0 10건)
- **13_cross_review_prompts_for_build_plan_v1.md** — Build Plan 외부 검토용 프롬프트
- **18_conditional_gate_evidence_v1.md** (S346 신규, S346 W19 D-5 보강) — BeSir Conditional C-1·C-2·C-3·C-4 게이트 통과 증거 + 미팅 talking points + KPI query 예제
- **19_open_issues_resolution_plan_v1.md** (S346 신규) — 오픈이슈 #5/#6/#9 처리 방안
- **20_live_demo_scenario_v1.md** (S346 신규, W19 D-5 추가) — F602/F603/F606/F607 통합 데모 시나리오 (15-20분, BeSir 5/15 미팅 실시간 시연)
- **21_kpi_calculation_table_v1.md** (S348 신규, Sprint 377 F604) — 8 KPI 산정 메커니즘 표 (D1 소스 / SQL / 주기 / 단위 / 임계값 / §2.3 #6 매핑). 16 v1.1 §2.3 권고 #6 영구 해소.
- **17_internal_dev_plan_with_besir_v2.md** (S357 신규, 2026-05-12 D-3 BeSir 미팅) — v1 작성 후 6일간 Tier 1~5 17건 ✅ 완결 + T6 외부 unlock 4건(F604/F605/F619/F621) 매핑. v1과 1:1 진척 비교 표 포함. **5/14 dry-run + 5/15 미팅 페어 자료**.
- **20_live_demo_scenario_v2.md** (S357 신규, 2026-05-12) — v1 5 step 본문 유지 + **Step 6 F619 Multi-Evidence (코드 trace)** + **Step 7 F621 운영 통합 대시보드 (`/operations` URL 시연)** 추가. 18-22분 + Q&A 8건. **5/15 본 미팅 정본 시연 자료**.
- **21_kpi_calculation_table_v2.md** (S357 신규, 2026-05-12) — v1 8 KPI 산정 표 위에 **F621 4 본부 통합 시각화 매핑 + production API shape + graceful degradation + orgId filter 비대칭 + 5/14 dry-run 기대값** 추가. v2 정본.
- **22_hitl_console_v2.md** (S357 갱신, 2026-05-12) — v1 위에 **F605 ✅ MERGED 검증 + F621 4 본부 통합 모니터링 매핑 + source별 D1 UPDATE 실 구현 + F607 trace_id 통합 + 20 demo v2 Step 4/7 시나리오 + 잔존 5 F-item 후속**. v2 정본.

### Deprecated
- **01_master_plan_v0.1.md** — Decision Foundry 명칭 시절 (2026-04-29 v0.2 방향 전환으로 폐기)

### 기타 자산
- `ai-foundry-os/` — 서브 자료 보관소 (review round-1 archive 포함)
- `ai_foundry_os_target_architecture.{png,svg}` — 아키텍처 다이어그램

## 5. Foundry-X 영향도 — PRD P0 8개 (v1.1 patch 갱신, S346)

| P0 | 책임 영역 | 충족률 (v1.1) | Foundry-X 작업 / 매핑 F-item |
|----|----------|------------|---------------------|
| P0-1 | 5-Layer 통합 운영 | 15% (v1) → **15%** | F600 📋 idea (의존: F601 + F606 ✅ + F607 ✅ — 2/3 충족) |
| P0-2 | Multi-Tenant PG + RBAC 5역할 + KT DS SSO | 20% (v1) → **20%** ★ | F601 📋 idea (PG 인프라 외부 의존 unlock 대기) |
| P0-3 | 4대 진단 자동 실행 | 45% (v1) → **100%** ✅ | **F602 ✅ Sprint 357 MERGED** — core/diagnostic/ sub-app + 4 method (missing/duplicate/overspec/inconsistency) + audit-bus 통합 + D1 0144 |
| P0-4 | Cross-Org 4그룹 + core_differentiator default-deny | 0% ★★ (v1) → **골격 100%** ✅ | **F603 ✅ Sprint 363 MERGED** — core/cross-org/ sub-app + 4그룹 분류 + default-deny export 차단 + audit emit + D1 0150. 후속: F626 (차단율 측정 코드) |
| P0-5 | KPI 대시보드 8개 | 40% (v1) → **토대 100%** ✅ | **F604 ✅ Sprint 377 MERGED** — core/kpi/ sub-app + 4 위젯 (KpiTile/Sparkline/MetricGrid/TrendArrow) + 8 KPI 산정 코드 + dashboard 연동 + 산정 표 docs. F621 📋 idea (통합 한 화면) 별건 |
| P0-6 | HITL Console | 35% (v1) → **35%** | F605 📋 idea — AXIS-DS v1.2 agentic-ui + HITL escalation 룰 |
| P0-7 | Audit Log Bus | 25% (v1) → **100%** ✅ | **F606 ✅ Sprint 351 MERGED** — core/infra/audit-bus + trace_id chain + HMAC SHA256 + append-only D1 + W3C Trace Context middleware (S337 hardening PR #766) |
| P0-8 | AI 에이전트 투명성 | 50% (v1) → **토대 100%** ✅ | **F607 ✅ Sprint 359 MERGED** — core/ethics/ sub-app + EthicsEnforcer (confidence < 0.7 escalation + FP 측정 + kill switch) + ethics_violations + kill_switch_state D1 0146 + 4 endpoints + 3 audit 이벤트 |

**진척 요약 (v1.1)**:
- ✅ **4/8 P0 토대 완결** (P0-3/P0-4/P0-7/P0-8) — 26 sprint 연속 진행 결과 (S320~S346)
- 📋 **3/8 P0 idea 잔존** (P0-1/P0-2/P0-5/P0-6) — F600 (5-Layer 통합) + F601 (PG 외부 의존) + F604/F605 (UI 위젯 + Console)
- 다음 우선순위: P0-2 PG 인프라 결정 unlock (외부) → P0-5/P0-6 UI 위주 (내부 즉시 가능)

## 6. Foundry-X 신규 작업 — 5 sub-app + 3 횡단 레이어

### Sub-App (`packages/api/src/core/`)

```
├── (기존 10: agent/ collection/ decode-bridge/ discovery/ events/ files/ harness/ offering/ shaping/ verification/)
├── guard/                [NEW] mount: /api/v1/guard
├── launch/               [NEW] mount: /api/v1/launch
├── diagnostic/           [NEW] mount: /api/v1/diagnostic
├── cross-org/            [NEW] mount: /api/v1/cross-org
└── multi-tenant/         [NEW] mount: /api/v1/multi-tenant
```

각 sub-app: `index.ts` + `types.ts` (zod contract) + `routes/` + `services/` + `tests/`. Foundry-X MSA 원칙(`core/{domain}/` 전용, types.ts contract, Hono sub-app) 준수.

### 횡단 레이어

1. **PostgreSQL Schema 격리** — D1 dual storage, 본부별 schema (Foundry-X 외부 인프라 1건 결정 필요)
2. **KT DS SSO 어댑터** — OIDC/SAML, arctic 또는 자체
3. **Audit Log Bus** — trace_id chain + HMAC + append-only + SIEM 발행, 5 repo 모두 수신·발행

## 7. 12주 Critical Path (W18 ~ W29) — v1.1 갱신

| 주차 | 게이트 / 작업 | Phase | 진척 (v1.1) |
|------|--------------|-------|-------------|
| W18 (5/5~5/9) | Foundry-X SPEC backlog 등록 + 별 트랙 정리 | Phase 1 | ✅ **완료** + W19 일정 사전 진척 (P0-3/P0-4/P0-7/P0-8 토대 ✅, F602/F603/F606/F607 MERGED) |
| W19 (현재, 5/10, **D-5 to 5/15 BeSir 미팅**) | BeSir Conditional C-1·C-2·C-4 게이트 통과 | Phase 1 | 🔧 진행 — 4/8 P0 토대 ✅ 사전 확보, 잔여 v1.1 patch 처리 + 발표 자료 보강 |
| W20~W22 | 5 sub-app 스캐폴드 + types.ts + PG PoC | Phase 2 | ✅ **사전 진행 완료** — P0-3/P0-4/P0-7/P0-8 sub-app 모두 신설 + types.ts contract + audit-bus T1 토대. PG PoC만 잔여 |
| W22~W26 | 5-Layer α1~α4 통합 빌드 + Cross-Org default-deny 코드 강제 | Phase 2 | 🔄 default-deny ✅ (F603), 5-Layer 통합 (F600) idea 잔존 |
| W26 | KPI 위젯 + HITL Console + Audit Bus 통합 시연 | Phase 2 | 🔄 Audit Bus ✅ (F606), KPI 위젯 + HITL Console (F604/F605/F621) idea 잔존 |
| W29 (8월 초) | Phase 3 진입 정비 — 도메인 합의·데이터 협조·KT 본부 align | Phase 3 | 📋 외부 의존 — BeSir D-day 후 결정 |

## 8. 누락 발견 (16 v1 → v1.1 patch — S346 처리 현황)

- **P1 누락 3건** (BeSir 정합성 핵심):
  - `/ax:domain-init β` → **F623 등록됨** (T4, F628+F629 ✅ 의존, idea 단계)
  - `Six Hats 외부 LLM 호출 패턴` → **F624 ✅ Sprint 356 MERGED** (sixhats-llm-policy + KV cache 통합 + audit 발행, T2 마무리)
  - `CQ 5축 운영 검증` → **F632 등록됨** (CQ 5축 + 80-20-80 검수 룰, T3, F602 의존 ✅, idea 단계)
- **§6.4 윤리 AI 임계 정책** → **사실상 해소** (F607 ✅ Sprint 359 — confidence < 0.7 HITL escalation + FP 측정 + kill switch + 4 endpoints + 3 audit 이벤트 모두 구현). 잔여: 운영 SOP + 주간 리포트 자동화 (별 F-item)
- **§5.3 core_diff 차단율 < 100% 측정 코드** → **사실상 해소** (F603 ✅ Sprint 363 default-deny export 차단 + cross_org_export_blocks + **F626 ✅ Sprint 364 MERGED** core_differentiator 차단율 KPI 측정 코드)
- **§5.1 KPI 8개 산정 코드/UI 매핑 1:1** → **잔존** (F604 idea + F621 idea — KPI 위젯 4종 + 산정 코드 매핑 미구현)
- **오픈이슈 3건 미반영**: #5 외부 자료 마스킹 가이드 v2 / #6 BeSir MCP Tools 통합 시점 / #9 본부 비개발자 교육 영상 — **모두 잔존**
- **Foundry-X 24h+ 드리프트** → **해소** (14 baseline v1 Phase 46/Sprint 331 → v1.1 patch Phase 47/Sprint 376, +45 sprint 진척, 41 sprint 연속 성공 S306~S346)

**§8 누락 8건 → 5건 사실상 해소 / 3건 잔존** (해소율 62.5%):
- ✅ 해소: Six Hats(F624) / CQ 5축(F632 등록) / §6.4 윤리(F607) / §5.3 core_diff(F603+F626) / 24h 드리프트(14 v1.1)
- 📋 잔존: §5.1 KPI 매핑(F604/F621) / 오픈이슈 3건(별 docs/Marker.io) / /ax:domain-init β(F623 idea)

## 9. SPEC.md 매핑 (v1.1 갱신, S346)

| AI Foundry | Foundry-X SPEC §5 | REQ | Status (v1.1) |
|-----------|------------------|-----|---------------|
| P0-1 5-Layer 통합 | F600 | FX-REQ-664 | 📋 idea (의존: F601 + F606 ✅ + F607 ✅, 2/3 충족) |
| P0-2 Multi-Tenant PG+RBAC+SSO | F601 | FX-REQ-665 | 📋 idea (PG 외부 의존) |
| P0-3 4대 진단 자동 실행 | F602 | FX-REQ-666 | **✅ Sprint 357 MERGED** |
| P0-4 Cross-Org default-deny | F603 | FX-REQ-667 | **✅ Sprint 363 MERGED** (골격) |
| P0-5 KPI 대시보드 8개 | F604 + F621 | FX-REQ-668, FX-REQ-686 | 📋 idea (UI 위주, 외부 무의존) |
| P0-6 HITL Console | F605 | FX-REQ-669 | 📋 idea (UI 위주, 외부 무의존) |
| P0-7 Audit Log Bus | F606 | FX-REQ-670 | **✅ Sprint 351 MERGED** (T1 토대 + S337 PR #766 hardening) |
| P0-8 AI 에이전트 투명성 | F607 | FX-REQ-671 | **✅ Sprint 359 MERGED** (윤리 임계 + kill switch 포함) |

**P1 누락 추가 매핑** (S346 갱신):
| 누락 항목 | F-item | Status |
|----------|--------|--------|
| /ax:domain-init β | F623 | 📋 idea |
| CQ 5축 검수 | F632 | 📋 idea (의존: F602 ✅ 충족) |
| Six Hats 외부 LLM 호출 패턴 | F624 | **✅ Sprint 356 MERGED** (sixhats-llm-policy + KV cache + audit) |
| core_diff 차단율 측정 | F626 | **✅ Sprint 364 MERGED** (F603 후속) |

> **Phase 48 → 미사용**: F602/F603/F606/F607이 Phase 47 안에서 모두 흡수됨 (Sprint 351~363). 잔여 idea(F600/F601/F604/F605)는 BeSir 미팅 결과에 따라 Phase 47 후반 또는 신규 Phase로 분해.

## 10. 다음 액션 — v1.1 갱신 (S346, 오늘 2026-05-10 W19 D-5)

### W18 (~5/9) — ✅ 완료 + 사전 진척
- ✅ INDEX.md v1 합의 + SPEC.md F600~F607 등록 (W18 원안)
- ✅ **사전 진척**: F602/F603/F606/F607 4건 모두 Sprint 351~363에서 MERGED 완료 (W18~W19 잠재 보너스)
- ✅ Phase 47 / Sprint 376까지 41 sprint 연속 성공 (S306~S346)
- ✅ **S346 W19 D-5 v1.1 patch 일괄 처리** (이번 세션):
  - INDEX.md v1 → v1.1 (commit `bf0bfe99`, `cdc941f7`)
  - 14_repo_status_audit_v1 → v1.1 patch (Sprint 331 → Sprint 376)
  - 16_validation_report_v1 → v1.1 patch (권고 10건 80% 해소)
  - 02_ai_foundry_phase1_v0.3 → v0.4 patch (Changelog v0.4 entry)
  - **18_conditional_gate_evidence_v1.md** 신규 (C-1 ✅ 통과 증거 + C-2/C-3/C-4 진행)
  - **19_open_issues_resolution_plan_v1.md** 신규 (#5/#6/#9 처리 방안)
  - **05_executive_one_pager_v3.md** 신규 (BeSir 5/15 D-5 사전 자료)

### W19 (현재, 5/10 → **5/15 BeSir 미팅 D-5**)
1. **잔여 v1.1 patch 처리** (S346 사실 확인 결과, 잔여 축소):
   - ~~Six Hats 외부 LLM 호출 패턴 → F-item 신규 등록 검토~~ → **F624 ✅ Sprint 356 사실상 처리됨**
   - ~~F626 core_diff 차단율 측정 코드 신규 등록~~ → **F626 ✅ Sprint 364 사실상 처리됨**
   - 오픈이슈 #5/#6/#9 처리 방안 (Marker.io / 별 docs) — **잔존**
   - 02_ai_foundry_phase1_v0.3.md → v0.4 patch (P1 누락 5건 ✅ 반영) — **선택적**
   - 16_validation_report_v1.md → v1.1 patch (S346 잔존 3건 / 해소 5건 명시) — **선택적**
2. **BeSir 미팅 발표 자료 보강**:
   - 05_executive_one_pager v3 작성 (Phase 47 v1.9 진척 + 4/8 P0 토대 ✅ 반영)
   - Conditional C-1·C-2·C-4 게이트 통과 자료 (06_architecture_alignment_with_besir_v1.md 참조)
   - Live demo 시나리오 (F602/F603/F606/F607 통합 데모)
3. **Conditional 게이트 통과 증거**:
   - C-1: P0 토대 4건 ✅ (F602/F603/F606/F607)
   - C-2: 외부 의존 정리 (`17_internal_dev_plan_with_besir_v1.md` T1~T7 매트릭스)
   - C-4: 윤리/투명성 코드 강제 (F607 EthicsEnforcer + kill switch)

### W20+ — BeSir 게이트 통과 후
- F601 (Multi-Tenant PG) — PG 인프라 결정 unlock 후 sub-app 스캐폴드
- F604 (KPI 위젯 4종) + F621 (KPI 통합 한 화면) — UI 위주 내부 즉시 가능
- F605 (HITL Console) — AXIS-DS v1.2 agentic-ui 통합
- F600 (5-Layer 통합 운영) — F601 unlock 후, 5 repo orchestration

---

**관련 외부 자산**: `~/work/axbd/.secrets/ai-foundry/` (live API key, 600 권한, repo 외부)
