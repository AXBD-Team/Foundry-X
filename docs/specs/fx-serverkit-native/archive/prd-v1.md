---
title: ServerKit Native PRD v1 — BeSir 자체구축 (CQ 5축 + 80-20-80 HITL)
slug: fx-serverkit-native
version: v1
date: 2026-05-16
session: S361
author: AX BD팀 (Sinclair Seo, AX BD팀 리드)
status: 🔄 검토 중
classification: 기업비밀II급
references:
  - docs/specs/ai-foundry-phase1/06_architecture_alignment_with_besir_v1.md (2026-04-29 BeSir × KT DS 미팅 정합성 분석 v1)
  - docs/specs/ai-foundry-master-plan/06_architecture_alignment_with_besir_v1.md
related_f_items:
  - F600 (5-Layer 통합) — 의존 unlock 대상
  - F601 (Multi-Tenant + SSO) — 분리 트랙
  - F625 (CQ 5축 운영 검증) — 본 PRD 직접 흡수
  - F606 (Audit Log Bus) — ✅ MERGED 토대 활용
  - F607 (윤리 임계) — ✅ MERGED 토대 활용
---

# ServerKit Native PRD v1

**버전:** v1
**날짜:** 2026-05-16
**작성자:** AX BD팀 (Sinclair Seo)
**상태:** 🔄 검토 중

> Phase 2 (3-AI 자동 검토) 진입 전 초안. 검토 후 prd-v2.md 갱신.

---

## 1. 요약 (Executive Summary)

### 1.1 한 줄 정의

**ServerKit Native** = Foundry-X가 BeSir(서버키트)의 핵심 검증 컨셉(CQ 5축 + 80-20-80 HITL)을 자체적으로 흡수하여, AX BD팀 내부 컨설턴트가 컨설팅 워크플로우의 자동 평가·검수·핸드오프를 일관되게 수행할 수 있게 하는 자체구축 검증 엔진이다.

### 1.2 배경

- 2026-04-29 BeSir(서버키트) × KT DS AX컨설팅팀 미팅에서 BeSir 솔루션 아키텍처와 AI Foundry v0.2 정의서의 정합성을 분석([06_architecture_alignment_with_besir_v1.md](../ai-foundry-phase1/06_architecture_alignment_with_besir_v1.md))
- BeSir의 5가지 핵심 인사이트 — 온톨로지 = 시멘틱 레이어 / 80-20-80 검수 / CQ 검증 / 5축 100점 + 90점 핸드오프 / Graph·Vector DB 의도적 미사용 — 가운데 **CQ + 80-20-80**이 AI Foundry P0 안건(F600/F601/F625) unblock에 핵심임을 확인
- **2026-05-15 BeSir D-day 미팅** 결과: 시연 미진행, 사업협력 위주 논의, **ServerKit 연동 drop** 결정. 자체구축으로 전환
- AI Foundry P0 안건(F600 5-Layer 통합, F601 Multi-Tenant, F625 CQ 5축 검증)이 BeSir 외부 의존 때문에 unblock 못한 상태 → 자체구축이 즉시 unlock 경로

### 1.3 목표

- **Core MVP** (Must Have, 2~3 sprint): CQ 5축 평가 엔진 + 80-20-80 HITL 워크플로우 + HITL Console UI
- **Phase 2** (Should Have, 백로그): 원본 DB 직결 + 자동화 상태 변경 정책 (분석 X 자동화 O)
- **Out-of-scope**: 7-타입 온톨로지 흡수, Graph/Vector DB 미사용 흡수 — Phase 4+ 별 PRD에서 검토

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

#### 2.1.1 AI Foundry P0 안건 unblock 부재
- F600 (5-Layer 통합 운영) — 📋(idea), 충족률 ~15% (자체 BD 파이프라인은 v1.9.0 성숙, 5 repo orchestration Control Plane 0)
- F601 (Multi-Tenant PG + RBAC + SSO) — 📋(idea), 충족률 ~20% (middleware 흔적만), 외부 PG 인프라 결정 1건 unlock 후 진행 가능
- F625 (CQ 5축 운영 검증) — 📋(idea), AI Foundry §8 patch 3 / `06_architecture_alignment_with_besir_v1.md` P1 누락 3건 중 하나

→ 세 P0 안건 모두 BeSir 외부 솔루션 도입 가정 하에 설계되어 있어, 자체적으로 진행 불가 상태

#### 2.1.2 Foundry-X 내 검증 체계 부재
- 현 Foundry-X는 4대 진단(Missing/Duplicate/Overspec/Inconsistency)만 빌드 단계에서 적용 (F602)
- 운영 단계 (graph_session 종결 시점) 검증 체계 = **부재**
- HITL Reviewer 개념 = 모호 (F607 ✅ MERGED에서 윤리 임계만 명시)
- **CQ 5축 운영 검증**도, **80-20-80 검수 룰**도, **90점 핸드오프 자동화**도 없음

#### 2.1.3 토대만 일부 존재
- F606 (Audit Log Bus) ✅ MERGED — trace_id 전파 토대 활용 가능
- F607 (윤리 임계) ✅ MERGED — 자동 임계 + 정지 토대 활용 가능
- F582 (DiagnosticCollector) — 4대 진단 수집 토대, 5축 평가로 확장 가능

### 2.2 목표 상태 (To-Be)

#### 2.2.1 CQ 5축 자동 평가 + 운영 단계 검증
- 모든 graph_session 종결 시점에 **CQ 5축 자동 평가** (별도 평가 에이전트, 문맥 분리)
- 5축 각 100점 만점 채점 → 평균 점수 산출 → 90점 핸드오프 자동 트리거
- 점수 < 90점인 경우 (a) 휴먼 에러 / (b) 인프라 이슈 분류로 자동 라벨링

#### 2.2.2 80-20-80 검수 룰 운영
- AI가 80% 수준 결과물 생성 + 자체 평가 (리소스 충실도/할루시네이션)
- 집중 검수: 나머지 20%에 다시 80% 채움 (AI 재호출 또는 HITL 검수 큐 등록)
- 사람 최종 체크 → 100% 완성 (HITL Console UI에서 의사결정 입력)
- 각 단계의 trace_id 전파 + audit_events 기록 (F606 ✅ 토대 활용)

#### 2.2.3 AI Foundry P0 unlock 경로
- F625 (CQ 5축 운영 검증) → MVP로 직접 흡수 → ✅ MERGED
- F600 (5-Layer 통합) → CQ + 80-20-80 흡수 후 design/impl 단계 진입 가능
- F601 (Multi-Tenant + SSO) → 별 트랙 (본 PRD에서 의존 0)

### 2.3 시급성

- **즉시 (W19~W20 본격 진행)**: AI Foundry 로드맵 P0 안건이 BeSir 외부 의존으로 blocked 상태였으나 5/15 결정으로 자체구축 트랙 열림
- **2~3 sprint MVP 목표**: 2026-05-16 시동 → ~2~3주 내 Core MVP 완결 → Dogfood 1회 PASS
- 자체구축 안 하면: AI Foundry P0 안건 idea 단계로 무기한 정체 + Foundry-X v2.0 마일스톤 진입 불가

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| **AX BD 컨설턴트** (7명) | KT DS AX 컨설팅팀 도메인 SME (Subject Matter Expert) | (1) graph_session 자동 평가 결과 확인, (2) 80-20-80 4단계 흐름의 사람 검수 단계에서 의사결정 입력, (3) CQ 5축 점수 분포 분석 |
| **AX BD admin** (3명) | 운영·관리, RBAC Admin 역할 | (1) HITL 검수 큐 모니터링 + 배정, (2) 90점 핸드오프 임계 조정, (3) graph_session 결과 감사 (audit_events 조회) |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| **AX 사업총괄** (관리자 1명) | 5/15 사업협력 결정 / ServerKit drop 결정권자 | 매우 높음 — 본 PRD 트랙 승인 |
| **AI Foundry P0 안건 담당자** (TBD) | F600/F601/F625 후속 sprint 추진 주체 | 높음 — 본 PRD MVP가 P0 unlock 전제조건 |
| **F606/F607 ✅ MERGED 유지보수** | Audit Log Bus + 윤리 임계 토대 | 보통 — 본 PRD가 두 토대 활용 |
| **KOAMI/Decode-X Dogfood 운영자** | 실제 컨설팅 세션 진행, MVP Dogfood 1회 PASS의 운영 주체 | 높음 — 성공 기준 §5.2 |

### 3.3 사용 환경

- **기기**: PC (사내망)
- **네트워크**: 사내망 + Cloudflare Workers 통해 외부 SaaS (Anthropic API, OpenRouter)
- **기술 수준**: 비개발자 (컨설턴트) 또는 도메인 전문가
- **컴플라이언스**: 기업비밀II급

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have) — Core MVP

| # | 기능 | 설명 | 우선순위 | 흡수 출처 |
|---|------|------|----------|---------|
| 1 | **CQ 5축 평가 엔진** | graph_session 종결 시점에 5축(온톨로지/툴선택/코드/결과/거버넌스) 각 100점 자동 채점. 별도 평가 에이전트(문맥 분리, Sonnet 4.6). 평균 점수 + 축별 점수 저장 (D1 schema 신규) | P0 | BeSir §1.6 |
| 2 | **90점 핸드오프 자동화** | 평균 점수 ≥ 90이면 자동 핸드오프(자동화 트리거). < 90이면 (a) 휴먼 에러 / (b) 인프라 이슈 자동 분류 라벨링 | P0 | BeSir §1.6 |
| 3 | **80-20-80 HITL 워크플로우 (5단계 흐름)** | (1) AI 80% 자동 생성 + 자체 평가 → (2) 20% 식별 + 집중 검수 (AI 재호출) → (3) AI 80% 최종 → (4) HITL 검수 큐 등록 → (5) 사람 최종 체크 (의사결정 입력) | P0 | BeSir §1.4 |
| 4 | **HITL Console UI** | 검수 큐 + 5단계 흐름 시각화 + 의사결정 입력 (React + Vite + Hono API). 각 단계 trace_id 전파 + audit_events 기록 (F606 ✅ 토대) | P0 | BeSir §3.6 보강 |
| 5 | **CQ 작성 가이드 (사람 전용)** | CQ = 시스템에 던지는 핵심 질문 + 정답지 쌍. **사람이 직접 작성** (AI 금지) 매뉴얼 명문화. CQ 라이프사이클: 작성 → 정답지 시점 고정 → 평가 에이전트 호출 → 점수 산출 | P0 | BeSir §1.5 |

### 4.2 부가 기능 (Should Have) — Phase 2 백로그

| # | 기능 | 설명 | 우선순위 | 흡수 출처 |
|---|------|------|----------|---------|
| 1 | **원본 DB 직결** | 분석 도구가 아닌 운영 구조적 행위로서, 원본 데이터 source까지 직결하여 상태 변경 수행 ("분석 X, 자동화 O") | P1 | BeSir §1.1 + §2.4 |
| 2 | **자동화 상태 변경 정책** | 90점 핸드오프 통과 시 자동 상태 변경 트리거. 본부별/도메인별 RBAC 정책 분리 (F603 default-deny 연동) | P1 | BeSir §2.4 |
| 3 | **6축 점수 호환 인터페이스** | 기존 dual_ai_reviews 6축 점수 + CQ 5축 점수의 통합 view (별 메트릭으로 공존, 4대 진단 + CQ 이층 검증 명시) | P1 | BeSir §2.5 + Q4 |

### 4.3 제외 범위 (Out of Scope) — Phase 4+

- **7-타입 온톨로지 흡수** (Fact/Dimension/Workflow/Event/Actor/Policy/Support, 12-노드 → 7-타입 압축) — 현 Foundry-X 4-Asset Model 영향 큼, 별 PRD
- **Graph/Vector DB 의도적 미사용 흡수** (Neo4j drop, 파일+Git+PostgreSQL) — 현 D1+sqlite 구조와 별개, F601 PG 트랙과 별 PRD
- **AI Foundry 외 도메인 적용** — 본 PRD는 AX BD 컨설팅 워크플로우 한정. 다른 도메인 확장은 Phase 4+
- **고객사 운영자 사용 시나리오** — 본 PRD는 AX BD팀 내부 한정. 고객사 페이드는 별 PRD

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Anthropic API (Claude Sonnet 4.6) | HTTPS REST (`api.anthropic.com`) | 필수 (CQ 5축 평가 에이전트) |
| OpenRouter (백업/벤치마크 비교용) | HTTPS REST | 선택 (Sonnet 단일로 충분) |
| F606 Audit Log Bus (Foundry-X 내부) | 함수 호출 (`emitAuditEvent`) | 필수 (trace_id 전파) |
| F607 윤리 임계 (Foundry-X 내부) | 함수 호출 | 필수 (자동 임계 + 정지) |
| F582 DiagnosticCollector (Foundry-X 내부) | 함수 호출 | 선택 (4대 진단 연동) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| F625 CQ 5축 운영 검증 SPEC 상태 | 📋(idea) | ✅ MERGED | SPEC.md §5 F625 row 상태 |
| F600 5-Layer 통합 진척 | 📋(idea), 충족률 15% | design 단계 진입 (충족률 ≥ 30%) | SPEC.md §5 F600 row + 충족률 측정 |
| Dogfood 1회 PASS | 0 | 1 (KOAMI 또는 Decode-X) | graph_session 1건의 CQ 평균 점수 + 80-20-80 4단계 차수 완결 증거 |
| CQ 5축 자동 평가 정확도 | 0 | ≥ 80% (사람 평가 대비) | 사후 평가 (Dogfood 1회 후 비교 sample N≥10) |
| 80-20-80 4단계 평균 소요 시간 | N/A | < 30분 (graph_session당) | HITL Console 5단계 timestamp 차이 |
| audit_events trace_id chain 정합 | N/A | 100% (chainValid=true) | F606 ✅ 토대 활용, audit_events 테이블 chain 검증 |

### 5.2 MVP 최소 기준

- [ ] Core MVP 2~3 sprint 완결 + SPEC.md §5 F625 row 상태 ✅
- [ ] Dogfood 1회 (KOAMI 또는 Decode-X) session_id 증거 기록 (graph_session 1건)
- [ ] CQ 5축 평가 결과 + 80-20-80 4단계 timestamps + audit_events trace_id chain 보고
- [ ] F606/F607 토대 회귀 0건 (기존 ✅ MERGED 토대 영향 0)
- [ ] e2e 부채 누적 패턴 (F644~F656) 회피 — TDD Red→Green 사이클 준수

### 5.3 실패/중단 조건

- Dogfood 0건 또는 graph_session 미완결 → MVP 재정의 필요 (range scope 검토)
- F606/F607 토대 미작동 → ServerKit native 진행 불가, 토대 재진단 우선
- CQ 5축 자동 평가 정확도 < 50% → 평가 에이전트 프롬프트/구조 재설계
- 2~3 sprint 초과 (5 sprint+) → MVP 분할 또는 trade-off 재인터뷰

### 5.4 비기능 요구사항

- **응답 시간**: CQ 5축 평가 1회 < 60s (Sonnet 4.6 single LLM call)
- **가용성**: Foundry-X Cloudflare Workers 가용성 그대로 (≥ 99.5%)
- **보안**: 기업비밀II급 — production secrets `wrangler secret put`만, 코드 하드코딩 금지 (`.claude/rules/security.md` 준수)
- **감사**: 모든 graph_session 평가 + HITL 의사결정에 audit_events 1건 이상 (F606 trace_id 전파)
- **컴플라이언스**: CQ 작성 주체는 사람만 (AI 금지) — `.claude/rules/`에 ServerKit 규칙 신규 추가

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료일**: 2026-06-15 (S381+ 즈음, 본 PRD 시동 후 2~3 sprint = ~2~3주)
- **마일스톤**:
  - W20 (2026-05-19~05-25): PRD 검토 사이클 완료 + SPEC §5 F-item 등록 + Sprint N 배정
  - W21~W22 (2026-05-26~06-08): MVP Core 구현 (CQ 5축 + 80-20-80 + HITL Console UI)
  - W23 (2026-06-09~06-15): Dogfood 1회 + KPI 측정 + MVP 종결 회고

### 6.2 기술 스택

- **프론트엔드**: Vite 8 + React 18 + React Router 7 + Zustand (기존 Foundry-X 스택)
- **백엔드**: Hono + Cloudflare Workers + D1 (기존 Foundry-X 스택)
- **LLM**: Claude Sonnet 4.6 (`@foundry-x/shared/model-defaults` MODEL_SONNET, SSOT)
- **기존 시스템 의존**: F606 (Audit Log Bus) + F607 (윤리 임계) ✅ MERGED 토대 활용
- **D1 schema 신규**: `cq_evaluations` (5축 점수 + 평균) + `hitl_queue` (80-20-80 검수 큐) — 마이그레이션 ~165~167 신규
- **추가 인프라**: **0** (PG/Redis/Vector DB 등 도입 0, F601 PG 트랙과 분리)

### 6.3 인력/예산

- **투입 가능 인원**: AX BD팀 7명 + admin 3명 (내부)
- **예산 규모**: 외부 비용 0 (BeSir 라이센스/연동비 폐기, Anthropic API 비용은 기존 Foundry-X 운영비 내 흡수)
- **외주**: 없음

### 6.4 컴플라이언스

- **KT DS 내부 정책**: 기업비밀II급 (BeSir 정합성 분석 분류 적용)
- **보안 요구사항**:
  - production secrets `wrangler secret put`만 (코드 하드코딩 금지)
  - 모든 audit_events에 trace_id 전파 (F606 ✅ 토대)
  - HITL 사람 최종 체크 단계의 의사결정자 ID 기록 (RBAC + audit)
- **외부 규제**: 본 PRD scope 내 없음 (외부 데이터 전송 0, BeSir 같은 외부 파트너 연동 0)
- **외부 승인**: 5/15 사업협력 결정으로 별도 외부 승인 0

---

## 7. 오픈 이슈

> 인터뷰에서 확인되지 않았거나 추가 논의가 필요한 항목.

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | **CQ 5축 중 "온톨로지 활용도" 축의 측정 방법** — 7-타입 온톨로지 흡수 보류 상태에서 어떻게 측정할지. 후보: (a) 4-Asset Model 활용도로 대체, (b) 도메인 entity 매칭률, (c) 정의 단계 보류 후 4축만 운영 | Sinclair | PRD v2 (3-AI 검토 후) |
| 2 | **90점 핸드오프 자동화의 "자동 상태 변경" 범위** — Phase 2 백로그(원본 DB 직결)와 어떻게 분리할지. 본 PRD MVP에서는 핸드오프 알림 + 라벨링까지만? | Sinclair | PRD v2 |
| 3 | **HITL Console UI의 기존 admin-portal 통합 방식** — 별 라우트 신설? 기존 admin-portal 확장? | TBD (frontend 결정) | sprint 시동 전 |
| 4 | **dual_ai_reviews 6축과 CQ 5축의 view 통합 시점** — Should Have로 분류했으나 Core MVP에서 최소 read-only 통합 view 필요 여부 | Sinclair | PRD v2 |
| 5 | **D1 schema cq_evaluations 의 graph_session FK 결정** — 기존 graph_sessions 테이블 존재? 신규 신설? | TBD (db review) | sprint Plan 단계 |
| 6 | **CQ 작성 가이드 (좋은 CQ vs 나쁜 CQ)** — 매뉴얼 어디서 흡수? BeSir 원본 매뉴얼은 외부 자산이라 자체 작성 필요 | AX BD admin | Dogfood 전 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 v1 | 2026-05-16 | S361 인터뷰 5 파트 + 사용자 사전 결정 4 컨셉(흡수 2 + 보류 2) 기반 최초 작성 | - |
| R1 (예정) | TBD | 3-AI 검토 결과 반영 (`docs/specs/fx-serverkit-native/review/round-1/feedback.md`) | TBD |

---

## 9. 부록 A: BeSir 흡수 매핑

| BeSir 원본 인사이트 (06_v1.md §1) | 본 PRD 흡수 위치 | 흡수 결정 |
|---|---|---|
| §1.1 온톨로지 = 시멘틱 레이어 | — | ❌ 보류 (Phase 4+) |
| §1.2 7-타입 분류 | — | ❌ 보류 (Phase 4+) |
| §1.3 인터뷰 필수 | — | 인용만 (PRD 작성 패턴) |
| §1.4 80-20-80 검수 룰 | §4.1 #3 + #4 HITL Console UI | ✅ Core MVP |
| §1.5 CQ — 검증 시작점/종점 | §4.1 #5 CQ 작성 가이드 | ✅ Core MVP |
| §1.6 5축 100점 + 90점 핸드오프 | §4.1 #1 + #2 + §5.1 KPI | ✅ Core MVP |
| §1.7 Graph DB·Vector DB 미사용 | — | ❌ 보류 (Phase 4+) |
| §1.8 파일+Git+PostgreSQL 저장 아키텍처 | — | ❌ 보류 (Phase 4+) |

## 10. 부록 B: AI Foundry P0 unlock 경로

```
ServerKit Native MVP (본 PRD)
   │
   ├─ ✅ F625 (CQ 5축 운영 검증) — MVP 직접 흡수
   │     └─ AI Foundry §8 patch 3 P1 누락 해소
   │
   ├─ → F600 (5-Layer 통합) — design 단계 진입 가능
   │     └─ 4-Asset Model에 CQ 검증 추가 + Control Plane 점진 구축
   │
   └─ ⚠️ F601 (Multi-Tenant + SSO) — 본 PRD 분리, PG 도입 결정 별 트랙
         └─ ServerKit Native MVP는 D1 단일 (PG 의존 0)
```

---

*이 문서는 `/ax:req-interview` 스킬에 의해 자동 생성 및 관리됩니다.*
