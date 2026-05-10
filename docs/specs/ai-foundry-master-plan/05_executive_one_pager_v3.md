---
title: AI Foundry — 임원 1쪽 요약 v3 (W19 D-5 진척 + 4 P0 토대 ✅ + BeSir 5/15 D-day 사전 자료)
target_audience: KT Enterprise부문 + AX사업부문 임원, 사업본부 카운터파트
target_meeting: 5월 W19 BeSir 차기 미팅 (5/15 D-day, 본 자료 D-5)
source_docs:
  - 02_ai_foundry_phase1_v0.4 (S346 patch — Changelog v0.4 entry)
  - INDEX.md v1.1 (S346 patch)
  - 14_repo_status_audit_v1.1 (S346 baseline patch — Sprint 376)
  - 16_validation_report_v1.1 (S346 검증 결과 — 권고 10건 중 80% 해소)
  - 18_conditional_gate_evidence_v1 (S346 신규 — C-1 ✅ 통과 증거)
date: 2026-05-10 (W19 D-5)
prev_version: v2 (2026-04-30, BeSir 정합성 P0 10건 반영)
owner: Sinclair Seo (KTDS-AXBD)
co-owner: 서민원 (AX컨설팅팀)
classification: 기업비밀II급
---

# AI Foundry — Phase 1 W19 D-5 진척 보고 + BeSir 5/15 사전 자료 v3

> **v3 갱신 (S346, 2026-05-10)**: v2(4/30) 작성 후 11일 동안의 Foundry-X 진척 반영. **41 sprint 연속 성공** (S306~S346, F560~F641) + **P0 4건 토대 ✅** (F602/F603/F606/F607 모두 MERGED). 16 v1 권고 10건 중 80% 해소. C-1 ✅ 통과 증거 충분 (Sinclair PM 개입 < 10%).

## 1. 한 문장 정의

> **AI Foundry는 기업의 의사결정을 자산으로 만드는 Agentic AI 플랫폼입니다.**

기업 내 휘발되는 의사결정의 **근거·맥락·일관성**을 5-Layer 아키텍처로 처리하여, **5가지 영구 자산**(Policy Pack · Ontology · Skill Package · Decision Log · System Knowledge)으로 영구화하여 조직 IP로 축적합니다. **외부 한 줄**: "당신 조직의 critical 정책 충돌을 30일 안에 다 찾고, 감독 응답 시간을 일주일 → 즉시로 줄입니다."

## 2. v3 핵심 메시지 — W19 D-5 진척 (S346)

> **"P0 토대 50%가 11일 만에 ✅ — Foundry-X 자체 자동화 입증, BeSir 미팅에서 외부 sign-off만 받으면 W21 Sprint 1 진입 가능"**

| 지표 | v2 (4/30) | v3 (5/10, S346) | 변화 |
|------|-----------|-----------------|------|
| Foundry-X Phase | Phase 46 | **Phase 47** | +1 phase |
| Foundry-X Sprint | Sprint 331 | **Sprint 376** | +45 sprint |
| 41 sprint 연속 성공 | — | **S306~S346** | F560~F641 |
| autopilot Match 평균 | — | **~98%** | (95~100% 분포) |
| Sinclair PM 개입 | — | **< 10%** | C-1 ✅ |
| P0 토대 ✅ | 0/8 | **4/8** | P0-3/P0-4/P0-7/P0-8 |
| P0 평균 충족률 | ~25% | **~58%** | +33%pt |

## 3. v3 결재 안건 4건 (BeSir 5/15 D-5)

> v2의 안건 A~E 중 D(정의서 v0.3 → v1.0)는 v0.4 patch(S346)로 사실상 진행 중. 본 v3에서는 BeSir 미팅 4 sign-off 안건에 집중.

| # | 안건 | 게이트 | 사전 준비 |
|---|------|--------|----------|
| **1** | **본부 2개 잠정 선정** (HR · Ops · 심사·승인 중) | C-2 1번 안건 | 본부장 회의 + 5/15 BeSir 미팅 안건 협의 |
| **2** | **core_differentiator 4그룹 워크샵 일정** (W20~W21) | C-2 2번 안건 | F603 ✅ 골격 + 4그룹 분류 룰 사전 정리 (12 dev plan §2.3) |
| **3** | **Approver RBAC 5역 매핑 동의** (Admin/Reviewer/Approver/Operator/Auditor) | C-2 3번 안건 | F601 PG 인프라 결정과 동시, 06 PRD 명시 |
| **4** | **KPI 6/8 측정 시작 + 본부 데이터 협조 요청** | C-2 4번 + C-4 | KPI 6개 (2/3/4/6/7/8) 측정 코드 ✅ 사전 준비 — F602/F603/F607/F626/F629 활용 |

## 4. AI Foundry 5-Layer 아키텍처 (외부용)

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Foundry Console (HITL UI + 5-Asset 카탈로그) │ 📋 idea (F605)
├─────────────────────────────────────────────────┤
│ Layer 2: Decision Logger (Append-only Audit Bus) │ ✅ T1 (F606)
├─────────────────────────────────────────────────┤
│ Layer 3: Skill Package (ax-plugin Marketplace) │ ✅ 활성 (외부)
├─────────────────────────────────────────────────┤
│ Layer 4: Ontology Builder (7-타입 자동 추출 + 5-Asset) │ ✅ T2 (F628/F629/F630)
├─────────────────────────────────────────────────┤
│ Layer 5: Policy Engine (default-deny + 4대 진단 + AI 임계) │ ✅ T3+T4 (F602/F603/F607/F631)
└─────────────────────────────────────────────────┘
   횡단: Audit Bus(F606) ✅ / Multi-Tenant(F601) 📋 / KT DS SSO(F601) 📋
```

## 5. W18 ~ W22 마일스톤 (v3 갱신)

| 주차 | 게이트 / 작업 | Status (S346) |
|------|--------------|---------------|
| W18 (5/4~5/10) | Pre-착수 PoC + ax-plugin 메타 정리 | ✅ **완료** + W19 사전 진척 (P0 4건 토대 ✅) |
| **W19 (5/11~5/17, 5/15 BeSir D-day)** | **C-1·C-2·C-4 게이트 통과** | 🔧 **진행 — C-1 ✅ 자체 통과 / C-2/C-4 BeSir 미팅 sign-off 대기** |
| W20 (5/18~5/24) | KPI 베이스라인 측정 종료 + C-3 PRD §6.3.1 보강 | 📋 KPI 6/8 측정 코드 ✅ (즉시 가능) |
| W21 (5/25~5/31) | **G1+G2 게이트** (정의서 v1.0 + 5-Layer 모듈 스펙 v1.0) | 📋 02 v0.4 patch ✅ → v1.0 sign-off 가능 상태 |
| W22 (6/1~) | Phase 2 Prototype 착수 | 📋 5 sub-app + 3 횡단 레이어 사전 토대 ✅ 6/8 |

## 6. 통합 모델 결정 (v2 보존, v3 사실 확인)

- ✅ **MCP 표준 인터페이스** (느슨한 연동, Q4 결정 — v2)
- ✅ **AI Foundry 위상 = X1 자체 엔진 + BeSir 도구 부분 차용** (Q5 결정 — v2)
- ✅ **노드 모델 = BeSir 7타입 + Domain + Decision = 9타입** (v2)
- ✅ **검증 체계 = 4대 진단(빌드) + CQ(운영) 이층** (v2 / F602 ✅ + F632 등록)

## 7. 5월에 답을 받아야 하는 핵심 가설 4건 (H1~H4) — v2 보존, v3 진척

| # | 가설 | v2 상태 | v3 상태 (S346) |
|---|------|--------|---------------|
| H1 | 본부 2개 + core_diff 워크샵 협조 가능 | 외부 의존 | ⚠️ BeSir 미팅 sign-off 대기 |
| H2 | Foundry-X autopilot이 PM 개입 < 10% PoC 통과 | 미입증 | ✅ **41 sprint 연속 성공 + Match 98%** |
| H3 | 5 sub-app 단일 모노리포 안에 응집 가능 | 가설 | ✅ **4/5 sub-app 신설 ✅** (diagnostic/cross-org/audit/ethics) |
| H4 | KPI 8개 측정 코드 매핑 가능 | 미입증 | ✅ **6/8 측정 코드 ✅** (75%, F600/F601 unlock 시 100%) |

## 8. 결재 후 즉시 진행 (W21 G1+G2 통과 후)

1. F600 (5-Layer 통합 운영) sub-app 스캐폴드 — F601 unlock 후
2. F601 (Multi-Tenant PG + RBAC + SSO) — PG 인프라 결정 unlock 후
3. F604 (KPI 위젯 4종) + F605 (HITL Console) — AXIS-DS PR #55 머지 권한 확인 후
4. F619 (Multi-Evidence Integration) — Decode-X Phase 2-E 흡수 후

## 9. BeSir 미팅 사전 자료 (별 docs)

- **18_conditional_gate_evidence_v1.md** (S346 신규) — C-1 ✅ 통과 증거 + C-2/C-3/C-4 진행 상황
- 06_architecture_alignment_with_besir_v1.md — BeSir 정합성 P0 10건 (v2 기반)
- 17_internal_dev_plan_with_besir_v1.md §2~§3 — T1~T7 매트릭스 (외부 의존 분리)

## 10. 본 보고에서 결정해주실 것 (v3, BeSir 5/15 D-day)

- [ ] BeSir 미팅 4 sign-off 안건 (§3) — 본부 2개 + core_diff 워크샵 + Approver RBAC + KPI 협조
- [ ] W21 G1+G2 게이트 일정 확정 (5/25~5/31)
- [ ] Phase 2 Prototype (6월) 착수 일정 사전 확정
- [ ] (선택) 02 v0.4 → v1.0 sign-off 일정 (W21 G1+G2와 동시)

---

## 부록 — Foundry-X 진척 증거 (S346, 사내 회람용)

- **41 sprint 연속 성공**: S306 (2026-04-12) ~ S346 (2026-05-10), F560~F641, autopilot Match 평균 98%
- **P0 4건 토대 ✅**:
  - F602 ✅ Sprint 357 — 4대 진단 PoC (core/diagnostic/ + 4 method + audit-bus)
  - F603 ✅ Sprint 363 — Cross-Org default-deny 골격 (4그룹 분류 + cross_org_export_blocks)
  - F606 ✅ Sprint 351 — Audit Log Bus T1 토대 (W3C Trace Context + HMAC SHA256)
  - F607 ✅ Sprint 359 — AI 투명성 + 윤리 임계 (EthicsEnforcer + kill switch)
- **P1 누락 5건 사실상 해소**: F624 (Six Hats) ✅ / F632 (CQ 5축) 등록 / F607 (윤리) ✅ / F603+F626 (core_diff) ✅ / 14 v1.1 (24h 드리프트) ✅
- **Production smoke 영구 차단**: F640 ✅ Sprint 375 (4 packages 0.18.4 통합) + multi-input probe CI 자동화

**관련 git commit (W18~W19 진척)**:
- `bf0bfe99` INDEX.md v1.1 patch
- `cdc941f7` 14 v1.1 patch + INDEX §8/§9/§10 보정
- `527d598c` Sprint 376 services/ 4 files closure (F641)
- `c100a6af` F640 — @hono/zod-openapi 0.18.4 4 packages 본 통합 (S345 학습 영구 차단)
