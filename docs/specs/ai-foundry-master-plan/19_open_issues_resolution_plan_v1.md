---
title: AI Foundry — 오픈이슈 #5/#6/#9 처리 방안 v1 (S346 W19 D-5)
purpose: PRD §8 오픈이슈 3건 (16 v1 권고 P9 잔존) 처리 방안 정리
date: 2026-05-10 (W19 D-5)
owner: Sinclair Seo
target_meeting: 2026-05-15 W19 BeSir 차기 미팅 (D-5)
classification: 기업비밀II급
prev_docs: 02_ai_foundry_phase1_v0.4 §8 + 16_validation_report_v1.1 §2.7 (잔존 3건)
status: #6 BeSir MCP Tools 통합 시점 → BeSir 5/15 미팅 안건 / #5 외부 마스킹 가이드 v2 → W26 일정 / #9 본부 교육 영상 → W20+ 외주
---

# 19. 오픈이슈 #5/#6/#9 처리 방안 v1

> **사용자 PM 노트**: 16 v1 권고 10건 중 P9 ("PRD §8 누락 오픈이슈 3건(L9·L10·L11) 15 §3 액션 inject") 잔존. 본 문서로 처리 방안 명시 + W19 BeSir 미팅 sign-off + W20~W26 일정 확정.

---

## 0. 요약

| # | 이슈 | 처리 방안 | 일정 | 게이트 |
|---|------|----------|------|--------|
| #5 | 외부 자료 마스킹 가이드 v2 | F607 EthicsEnforcer + PII Mask 통합 + W26 가이드 docs 작성 | W26 (6/22~6/28) | Phase 2 시연 직전 |
| #6 | BeSir MCP Tools 통합 시점 | **BeSir 5/15 미팅 안건** + MCP 표준 인터페이스 합의 (Q4 결정 v2) + W22 Tool 인터페이스 PoC | W19 (5/15) sign-off + W22 PoC | C-2 sign-off |
| #9 | 본부 비개발자 교육 영상 외주 | W20+ 외주 의뢰 + AXIS-DS PR #55 머지 후 KPI 위젯 시연 영상 (F604 의존) | W20~W22 외주 | F604 unlock 후 |

---

## 1. #5 외부 자료 마스킹 가이드 v2 — W26 일정

### 1.1 배경
- PRD §8 오픈이슈 #5 — 외부 자료 마스킹 가이드 v2 (W26)
- 16 v1 §2.7 권고 — 14·15 모두 미반영 (L9 → P9 잔존)
- F607 ✅ Sprint 359 EthicsEnforcer 코드 강제 + PII Mask 사전 토대 ✅

### 1.2 사전 토대 (S346 시점)
- **F607 ✅ Sprint 359**: EthicsEnforcer + ethics_violations + audit-bus 통합 (외부 노출 시 차단 trigger 가능)
- **PII Mask middleware**: middleware/pii-masker.middleware.ts + core/infra/pii-masker.ts (S346 F641 closure)
- **GuardX 09 dev plan §6**: PII Mask + default-deny 패턴 (Foundry-X core/policy/ 합류 가능, F615 idea)

### 1.3 처리 방안
1. **W22 (6/1~)**: F615 Guard-X Solo sub-app 스캐폴드 (PII Mask 코드 강제 통합)
2. **W26 (6/22~6/28)**: 외부 자료 마스킹 가이드 v2 docs 작성
   - PII pattern 분류 (개인정보/민감정보/내부 코드/기밀)
   - default-deny + opt-in 화이트리스트
   - F607 EthicsEnforcer 통합 (마스킹 violation → audit emit)
   - 본부별 마스킹 정책 정의 (Approver RBAC 5역과 연계)
3. **W26 Phase 2 시연 직전**: 가이드 v2 sign-off + 본부 공유

### 1.4 의존
- F615 Guard-X Solo (W22~W26)
- F607 ✅ EthicsEnforcer (사전 토대)
- 본부 SME 워크샵 (C-2 안건)

---

## 2. #6 BeSir MCP Tools 통합 시점 — BeSir 5/15 미팅 안건

### 2.1 배경
- PRD §8 오픈이슈 #6 — BeSir MCP Tools 통합 시점 (W19 BeSir 미팅)
- 16 v1 §2.7 권고 — 15 §3 W19에 미명시 (L10 → P9 잔존)
- v2 통합 모델 결정 (Q4) — MCP 표준 인터페이스 (느슨한 연동)
- 02 v0.3 §3.7.5 — MCP Tools Interface 신규 (A8 P0)

### 2.2 사전 토대 (S346 시점)
- **MCP 표준 채택 ✅** (v2 Q4 결정)
- **9타입 노드 모델 ✅** (BeSir 7타입 + Domain + Decision)
- **F628 Entity Registry ✅** (BesirEntityType 7타입 zod enum)
- **F624 ✅ Sprint 356 Six Hats LLM 패턴** (외부 LLM 호출 캐시 + audit, MCP 통합 사전 검증)

### 2.3 처리 방안 — BeSir 5/15 미팅 sign-off 안건
1. **5/15 미팅 sign-off**:
   - MCP Tools Interface 통합 시점 = **W22 (6/1~) PoC 시작**
   - BeSir 측 MCP 서버 endpoint 제공 (외부 의존)
   - 통합 범위 = Layer 4 Ontology Builder (7-타입 추출, F630 ✅) + Layer 3 Skill Package (ax-plugin marketplace)
2. **W19~W21 사전 준비**:
   - Foundry-X 측 MCP client 라이브러리 선정 (`@anthropic-ai/sdk` MCP support 확인)
   - 인증/SSO 통합 방식 (KT DS SSO + BeSir API Key)
3. **W22 PoC**: 단일 Tool (예: BeSir Ontology API 호출) PoC + 응답 정규화 + audit-bus 발행

### 2.4 의존
- BeSir 측 MCP 서버 제공 (외부)
- F601 SSO 어댑터 (W22~W26)
- F624 ✅ LLM 호출 정책 (KV cache + audit 패턴 재사용)

---

## 3. #9 본부 비개발자 교육 영상 외주 — W20+ 외주

### 3.1 배경
- PRD §8 오픈이슈 #9 — 본부 비개발자 교육 영상 외주 (W20)
- 16 v1 §2.7 권고 — 14·15 모두 미반영 (L11 → P9 잔존)
- F622 (운영·QA·교육 패키지, P3 idea) — 후속 통합 가능

### 3.2 사전 토대 (S346 시점)
- **F622 idea (FX-REQ-687)**: 운영 SOP + 본부별 시나리오 UAT + 4 그룹 교육 자료 + 변경관리 룰
- **AXIS-DS PR #55**: KPI 위젯 + HITL Console (시연 영상 콘텐츠 source)
- **05_executive_one_pager v3**: 임원/본부 1쪽 요약 (영상 스크립트 source)

### 3.3 처리 방안
1. **W20 (5/18~5/24)**: 외주 RFP 작성 + 견적 발주
   - 영상 4편 (각 5~10분):
     - (a) AI Foundry 한 줄 정의 + 5-Layer + 5-Asset (임원용)
     - (b) HITL Console 사용법 (Approver/Reviewer/Operator)
     - (c) KPI 대시보드 8개 해석 (본부장/SME)
     - (d) core_differentiator 4그룹 분류 워크샵 가이드 (SME)
2. **W21~W22**: 외주 제작 진행 + 사내 리뷰
3. **W26 Phase 2 시연 직전**: 영상 4편 sign-off + 본부 공유

### 3.4 의존
- F604 ✅ 또는 idea unlock (KPI 위젯 시연 영상)
- F605 ✅ 또는 idea unlock (HITL Console 사용법)
- 외주 업체 선정 (외부)
- F622 (운영·QA·교육 패키지 통합)

---

## 4. 종합 — W19~W26 일정 매핑

```
W19 (5/15 BeSir D-day) ──┐
  ├─ #6 MCP 통합 시점 sign-off (5/15 미팅)
  └─ #5/#9 사전 정리 (본 문서)

W20 (5/18~5/24) ──┐
  └─ #9 외주 RFP + 견적

W21 (5/25~5/31) ──┐
  ├─ #9 외주 제작 시작
  └─ G1+G2 게이트 (정의서 v1.0)

W22 (6/1~6/7) ──┐
  ├─ #6 MCP PoC 시작
  └─ #5 F615 Guard-X Solo 시작

W26 (6/22~6/28) ──┐
  ├─ #5 외부 마스킹 가이드 v2 sign-off
  └─ #9 영상 4편 sign-off + 본부 공유
```

---

## 5. BeSir 미팅 sign-off 요청 (5/15)

1. **#6 MCP Tools 통합 시점 합의**:
   - W22 PoC 시작 (Layer 4 Ontology Builder + Layer 3 Skill Package)
   - BeSir 측 MCP 서버 endpoint 제공 일정
   - SSO 통합 방식 (KT DS SSO + BeSir API Key)
2. **#5/#9 사전 통보**:
   - W26 외부 마스킹 가이드 v2 sign-off 일정
   - W20 본부 교육 영상 외주 RFP 발주

---

**관련 문서**:
- 02_ai_foundry_phase1_v0.4 §8 (오픈이슈 9건 PRD 본문 — v0.4 patch 보존)
- 16_validation_report_v1.1 §2.7 + §3 P9 (오픈이슈 잔존 권고)
- 18_conditional_gate_evidence_v1 (BeSir Conditional 게이트 통과 증거)
- 06_architecture_alignment_with_besir_v1.md §3.7.5 (MCP Tools Interface 신규)
- 09_dev_plan_guard_x_v1.md §6 (PII Mask 패턴)
- F615/F622/F624/F628/F630 SPEC.md row
