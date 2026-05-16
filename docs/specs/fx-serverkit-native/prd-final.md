---
title: ServerKit Native PRD final — BeSir 자체구축 (CQ 5축 + 80-20-80 HITL)
slug: fx-serverkit-native
version: final (v2 R2 Conditional 인지 후 사용자 착수 결정)
date: 2026-05-16
session: S361
author: AX BD팀 (Sinclair Seo, AX BD팀 리드)
status: ✅ 착수 결정 (스코어카드 R1 75 / R2 72, 발산 패턴 인지 후 정성 판단으로 착수)
classification: 기업비밀II급
verdict_details:
  round_1_score: 75
  round_2_score: 72
  divergence_pattern: 항목 1 가중 이슈 밀도 발산 (Gotcha 알려진 패턴)
  ai_verdict: 3/3 Conditional (조건 모두 §11 리스크 표 + §12 다음 단계로 명시화)
  user_decision: v2 그대로 prd-final 확정 + Phase 6 SPEC §5 F-item 등록 진행
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

# ServerKit Native PRD v2

**버전:** v2
**날짜:** 2026-05-16
**작성자:** AX BD팀 (Sinclair Seo)
**상태:** 🔄 검토 중

> Phase 2 (3-AI 자동 검토) 진입 전 초안. 검토 후 prd-v3.md 갱신.

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
<!-- CHANGED: Core MVP/Phase2(백로그) 경계 명확화 및 HITL/핸드오프 범위 구체화 -->
- **Core MVP 내 기능 경계 명확화**: CQ 5축 평가(온톨로지 활용도 축의 MVP 임시정의 포함), 80-20-80 HITL 워크플로우(실제 업무 흐름·역할·권한 입력 명확화), 90점 핸드오프 후 “알림(내부 노티)”+“자동 분류”까지만 구현 — 실제 데이터 상태 변경은 Phase 2로 분리
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

<!-- CHANGED: CQ 5축 "온톨로지 활용도" 축의 MVP 한정 정의 및 5축/4축 논란 명확화 -->
#### 2.2.1 CQ 5축 자동 평가 + 운영 단계 검증
- 모든 graph_session 종결 시점에 **CQ 5축 자동 평가** (별도 평가 에이전트, 문맥 분리)
- 5축 각 100점 만점 채점 → 평균 점수 산출 → 90점 핸드오프 자동 트리거
- **온톨로지 활용도(MVP 임시정의)**: 현 단계에서는 4-Asset Model에 명시된 도메인 엔티티 활용률/매칭률을 “온톨로지 활용도”로 간주(Phase 4+에서 7-타입 온톨로지로 대체 예정). 평가 에이전트 프롬프트도 이에 맞춰 설계.
- 점수 < 90점인 경우 (a) 휴먼 에러 / (b) 인프라 이슈 분류로 자동 라벨링
- *만약 해당 축의 기준이 불명확해 평가 불가할 경우, 4축만으로 자동 평가·핸드오프 진행 및 그 사실을 audit_events에 명시 기록.*

<!-- CHANGED: HITL 80-20-80 워크플로우의 실제 업무 흐름/역할/권한/입력/트레이스 분리 -->
#### 2.2.2 80-20-80 검수 룰 운영 (업무 흐름/역할 구체화)
- **1단계(AI):** AI가 전체 결과물의 80% 수준 자동 생성 및 자체 평가(리소스 충실도, 할루시네이션 등). 입력 주체: 시스템(자동).
- **2단계(집중 검수):** AI가 취약 20% 식별 후 재호출(자동) 또는 HITL 큐에 등록. 입력 주체: 시스템(자동, 필요 시 admin 지정).
- **3단계(AI):** 두 번째 80% 자동 생성(실제 96% 보장). 입력 주체: 시스템(자동).
- **4단계(HITL 큐 등록):** 나머지 4%는 HITL 검수 큐에 등록, 담당 컨설턴트/검수자에게 자동 배정. 입력 주체: admin 또는 시스템.
- **5단계(사람 최종 체크):** 담당 컨설턴트가 HITL Console UI에서 의사결정(합/불합, 사유, 추가 코멘트 등) 입력. 입력 주체: 컨설턴트, 입력자 RBAC+ID+timestamp 기록 필수.
- 각 단계별 trace_id 전파, audit_events 기록(최소 1건/단계), 입력 주체·역할·권한·입력필드·결정값 구분. 
- **실제 업무 흐름/권한**: 80-20-80 워크플로우 각 단계별 역할(자동화/사람/관리자) 분장 명확화, 의사결정권자는 컨설턴트(AX BD팀원), admin은 큐 관리·배정·임계값 조정.

#### 2.2.3 AI Foundry P0 unlock 경로
- F625 (CQ 5축 운영 검증) → MVP로 직접 흡수 → ✅ MERGED
- F600 (5-Layer 통합) → CQ + 80-20-80 흡수 후 design/impl 단계 진입 가능
- F601 (Multi-Tenant + SSO) → 별 트랙 (본 PRD에서 의존 0)

### 2.3 시급성

- **즉시 (W19~W20 본격 진행)**: AI Foundry 로드맵 P0 안건이 BeSir 외부 의존으로 blocked 상태였으나 5/15 결정으로 자체구축 트랙 열림
- **2~3 sprint MVP 목표**: 2026-05-16 시동 → ~2~3주 내 Core MVP 완결 → Dogfood 1회 PASS
<!-- CHANGED: 일정 리스크 반영 및 실소요 3~5주 가능성 명시 -->
- **일정 리스크**: 현업·검토 결과에 따라 3~5주(3 sprint+)가 소요될 수 있으므로, 일정 산정 및 스플릿 가능성 사전 인지 필요.
- 자체구축 안 하면: AI Foundry P0 안건 idea 단계로 무기한 정체 + Foundry-X v2.0 마일스톤 진입 불가

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| **AX BD 컨설턴트** (7명) | KT DS AX 컨설팅팀 도메인 SME (Subject Matter Expert) | (1) graph_session 자동 평가 결과 확인, (2) 80-20-80 5단계 흐름의 사람 검수 단계에서 의사결정 입력, (3) CQ 5축 점수 분포 분석 |
<!-- CHANGED: HITL 워크플로우 5단계에 '사람' 역할 명시 및 입력 주체 명확화 -->
| **AX BD admin** (3명) | 운영·관리, RBAC Admin 역할 | (1) HITL 검수 큐 모니터링 + 배정, (2) 90점 핸드오프 임계 조정, (3) graph_session 결과 감사 (audit_events 조회), (4) HITL 단계별 입력자/배정자 관리 및 예외처리 |

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
<!-- CHANGED: CQ 5축 '온톨로지 활용도'의 임시 정의 및 4축 대체 시 처리 명확화 -->
| 1 | **CQ 5축 평가 엔진** | graph_session 종결 시점에 5축(온톨로지/툴선택/코드/결과/거버넌스) 각 100점 자동 채점. "온톨로지 활용도"는 MVP에서는 4-Asset Model 내 도메인 엔티티 활용률로 임시 정의(추후 7-타입 온톨로지로 확장 예정). 만약 해당 축 평가 불가 시 4축만 평가·핸드오프, 이 사실은 audit_events에 기록. 별도 평가 에이전트(문맥 분리, Sonnet 4.6). 평균 점수 + 축별 점수 저장 (D1 schema 신규) | P0 | BeSir §1.6 |
| 2 | **90점 핸드오프 자동화** | 평균 점수 ≥ 90이면 자동 핸드오프(내부 알림·트리거, 실제 데이터 상태 변경은 Phase2로 분리). < 90이면 (a) 휴먼 에러 / (b) 인프라 이슈 자동 분류 라벨링 | P0 | BeSir §1.6 |
<!-- CHANGED: 80-20-80 HITL 워크플로우의 실제 업무 흐름/역할/입력/권한/트레이스 구체화 -->
| 3 | **80-20-80 HITL 워크플로우 (5단계 흐름, 역할/입력 명시)** | (1) AI 80% 자동 생성+자체 평가(시스템), (2) 20% 집중 검수(AI 재호출 또는 HITL 큐 등록·admin 배정), (3) AI 80% 최종(시스템), (4) HITL 검수 큐 등록+담당자 배정(admin/시스템), (5) 컨설턴트가 HITL Console UI에서 최종 합·불합 입력(RBAC+ID+timestamp 기록). 각 단계 trace_id 전파·audit_events 기록·입력필드 명시 | P0 | BeSir §1.4 |
| 4 | **HITL Console UI** | 검수 큐 + 5단계 흐름 시각화 + 의사결정 입력 (React + Vite + Hono API). 각 단계 trace_id 전파 + audit_events 기록 (F606 ✅ 토대). 각 단계별 입력주체/역할/권한/입력필드 구분, RBAC 권한관리 포함. | P0 | BeSir §3.6 보강 |
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
- [ ] CQ 5축 평가 결과 + 80-20-80 5단계 timestamps + audit_events trace_id chain 보고
- [ ] F606/F607 토대 회귀 0건 (기존 ✅ MERGED 토대 영향 0)
- [ ] e2e 부채 누적 패턴 (F644~F656) 회피 — TDD Red→Green 사이클 준수
<!-- CHANGED: 테스트/QA/롤백 기준 추가 -->
- [ ] 테스트/QA 체계: 각 핵심 기능별 테스트케이스 도출 및 사전 검증, 실패시 롤백 시나리오 마련

### 5.3 실패/중단 조건

- Dogfood 0건 또는 graph_session 미완결 → MVP 재정의 필요 (range scope 검토)
- F606/F607 토대 미작동 → ServerKit native 진행 불가, 토대 재진단 우선
- CQ 5축 자동 평가 정확도 < 50% → 평가 에이전트 프롬프트/구조 재설계
- 2~3 sprint 초과 (5 sprint+) → MVP 분할 또는 trade-off 재인터뷰
<!-- CHANGED: 롤백 및 예외처리 실패시 대응 명시 -->
- 테스트/QA 실패 후 롤백 불가 → 배포 보류 및 긴급 정상화 플랜 가동

### 5.4 비기능 요구사항

- **응답 시간**: CQ 5축 평가 1회 < 60s (Sonnet 4.6 single LLM call)
<!-- CHANGED: Cloudflare Workers 10~50ms CPU 제한에 따른 리스크 명시 및 fallback 방안 검토 필요 -->
- **성능 제약**: Cloudflare Workers의 10~50ms CPU 제한에 따라, 복잡한 CQ 평가 시 평가 요청을 분할하거나, 장기평가 fallback(비동기 알림) 필요
- **가용성**: Foundry-X Cloudflare Workers 가용성 그대로 (≥ 99.5%)
<!-- CHANGED: 보안/컴플라이언스 세부 정책 및 감사, CQ 작성 금지 예외처리, 입력자 이력 관리 명시 -->
- **보안**: 기업비밀II급 — production secrets `wrangler secret put`만, 코드 하드코딩 금지 (`.claude/rules/security.md` 준수)
  - audit_events 모든 기록에 trace_id, 입력자 RBAC+ID+timestamp 필수
  - CQ 작성은 사람만 가능(AI 금지), 위반시 자동 reject 및 감사 이력 남김
- **감사**: 모든 graph_session 평가 + HITL 의사결정에 audit_events 1건 이상 (F606 trace_id 전파, chainValid 검증)
- **컴플라이언스**: CQ 작성 주체는 사람만 (AI 금지) — `.claude/rules/`에 ServerKit 규칙 신규 추가
- **프롬프트 관리/버전 관리**: 평가 에이전트의 프롬프트는 별도 버전 관리(프롬프트ID, 버전, 변경이력)를 D1 schema에 기록, audit_events와 연동

---

## 6. 제약 조건

### 6.1 일정

- **목표 완료일**: 2026-06-15 (S381+ 즈음, 본 PRD 시동 후 2~3 sprint = ~2~3주)
- **마일스톤**:
  - W20 (2026-05-19~05-25): PRD 검토 사이클 완료 + SPEC §5 F-item 등록 + Sprint N 배정
  - W21~W22 (2026-05-26~06-08): MVP Core 구현 (CQ 5축 + 80-20-80 + HITL Console UI)
  - W23 (2026-06-09~06-15): Dogfood 1회 + KPI 측정 + MVP 종결 회고
<!-- CHANGED: 일정 리스크 명확화 -->
- **일정 리스크**: 실제 구현 및 QA·테스트·Dogfood 반영에 따라 3~5주(3 sprint+) 소요 가능성 높음. 일정 산정에 버퍼 반영 필요.

### 6.2 기술 스택

<!-- CHANGED: 평가 에이전트 격리 및 프롬프트 버전관리 항목 보강, D1 schema FK 설계 오픈 이슈 명시 -->
- **프론트엔드**: Vite 8 + React 18 + React Router 7 + Zustand (기존 Foundry-X 스택)
  - HITL Console UI는 기존 admin-portal과 별도 라우트 신설(React Router 7 동적 라우팅 적용), 추후 통합 검토
- **백엔드**: Hono + Cloudflare Workers + D1 (기존 Foundry-X 스택)
  - CQ 5축 평가 에이전트는 별도의 Worker 격리(문맥 분리, 리소스 보호)
- **LLM**: Claude Sonnet 4.6 (`@foundry-x/shared/model-defaults` MODEL_SONNET, SSOT)
- **기존 시스템 의존**: F606 (Audit Log Bus) + F607 (윤리 임계) ✅ MERGED 토대 활용
- **D1 schema 신규**: `cq_evaluations` (5축 점수 + 평균, 평가 프롬프트ID/버전 포함) + `hitl_queue` (80-20-80 검수 큐) — 마이그레이션 ~165~167 신규, graph_sessions 테이블 FK 설계는 오픈 이슈
- **추가 인프라**: **0** (PG/Redis/Vector DB 등 도입 0, F601 PG 트랙과 분리)
- **프롬프트 관리/버전 관리**: 평가 프롬프트·HITL 워크플로우 관련 프롬프트 모두 버전 관리 테이블에 등록(audit_events와 연계)

### 6.3 인력/예산

<!-- CHANGED: 역할 분장(프롬프트 설계/프론트엔드/DB 등) 명확화 -->
- **투입 가능 인원**: AX BD팀 7명 + admin 3명 (내부)
- **역할 분장**:
  - **프롬프트 설계/검증**: AX BD팀 내 LLM 담당자(별도 지정), 프롬프트 변경시 audit_events 기록
  - **프론트엔드**: 기존 admin-portal 담당자(React/Vite/HITL Console UI 신규)
  - **DB 구조 담당**: D1 schema/마이그레이션 담당 별도 지정, FK/이력관리/버전관리 연동
- **예산 규모**: 외부 비용 0 (BeSir 라이센스/연동비 폐기, Anthropic API 비용은 기존 Foundry-X 운영비 내 흡수)
- **외주**: 없음

### 6.4 컴플라이언스

<!-- CHANGED: 보안/컴플라이언스 세부 정책 및 예외/이력 관리 강화 -->
- **KT DS 내부 정책**: 기업비밀II급 (BeSir 정합성 분석 분류 적용)
- **보안 요구사항**:
  - production secrets `wrangler secret put`만 (코드 하드코딩 금지)
  - 모든 audit_events에 trace_id 전파 (F606 ✅ 토대)
  - HITL 사람 최종 체크 단계의 의사결정자 ID 기록 (RBAC + audit)
  - CQ 작성 단계에서 입력자/작성자 이력(사람임을 증명) 필수 저장, AI 작성 시도시 자동 reject
- **외부 규제**: 본 PRD scope 내 없음 (외부 데이터 전송 0, BeSir 같은 외부 파트너 연동 0)
- **외부 승인**: 5/15 사업협력 결정으로 별도 외부 승인 0

---

## 7. 오픈 이슈

> 인터뷰에서 확인되지 않았거나 추가 논의가 필요한 항목.

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
<!-- CHANGED: 온톨로지 활용도 축의 MVP 임시정의 및 4축 대체 명시, HITL 업무흐름/권한/입력/트레이스 분리 명확화, 핸드오프 후 처리 범위/경계 명확화 -->
| 1 | **CQ 5축 중 "온톨로지 활용도" 축의 MVP 임시정의** — 4-Asset Model 내 도메인 엔티티 활용률로 임시 측정, 7-타입 온톨로지 적용 전까지 한시적 운영. 5축 평가 불가시 4축만 운영 및 audit_events에 명시 | Sinclair | PRD v2 (3-AI 검토 후) |
| 2 | **90점 핸드오프 자동화의 "자동 상태 변경" 범위** — Core MVP에서는 핸드오프 알림·내부 트리거(내부 상태·라벨·노티)까지만, 실제 데이터 상태 변경(원본 DB 직결)은 Phase 2로 분리 | Sinclair | PRD v2 |
| 3 | **HITL Console UI의 기존 admin-portal 통합 방식 및 라우팅** — React Router 7 동적 라우팅 적용, 별도 라우트 신설 후 추후 통합 검토 | TBD (frontend 결정) | sprint 시동 전 |
| 4 | **dual_ai_reviews 6축과 CQ 5축의 view 통합 시점** — Should Have로 분류, Core MVP에서 최소 read-only 통합 view 필요 여부 | Sinclair | PRD v2 |
| 5 | **D1 schema cq_evaluations 의 graph_session FK 결정** — 기존 graph_sessions 테이블 존재 확인, 신규 신설·FK 설계 필요 | TBD (db review) | sprint Plan 단계 |
| 6 | **CQ 작성 가이드 (좋은 CQ vs 나쁜 CQ)** — 매뉴얼 자체 작성 필요, BeSir 원본 매뉴얼 인용 불가, Dogfood 전 확정 | AX BD admin | Dogfood 전 |
<!-- CHANGED: 테스트/QA 체계, 프롬프트 관리 정책, 롤백/예외처리, 데이터 거버넌스/이력 관리, 장애/예외처리 항목 명시 -->
| 7 | **테스트/QA 및 롤백/예외처리 체계 구체화** — 기능별 테스트케이스, 실패시 롤백 정책, 장애 발생 시 예외처리 플로우 | Sinclair | PRD v2 |
| 8 | **프롬프트 관리/버전 관리 정책 구체화** — 평가 프롬프트별 버전, 변경이력, rollback, audit_events 연계 정책 | BD팀 LLM 담당 | PRD v2 |
| 9 | **데이터 거버넌스/이력 관리 체계** — CQ/평가/의사결정/프롬프트 버전 등 모든 이력 D1에 기록 및 조회 정책 | BD팀 DB 담당 | PRD v2 |
| 10 | **장애/예외 처리 정책 명확화** — LLM 평가 장애/Timeout/Cloudflare 제한 초과 등 예외 시 fallback/알림/재시도 정책 | Sinclair | PRD v2 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 v1 | 2026-05-16 | S361 인터뷰 5 파트 + 사용자 사전 결정 4 컨셉(흡수 2 + 보류 2) 기반 최초 작성 | - |
| R1 | 2026-05-16 | 3-AI 검토 결과 반영(온톨로지 활용도 임시정의, HITL 업무흐름/역할/권한, QA/테스트/프롬프트관리/예외처리/데이터거버넌스/보안 등) | Conditional |

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

## 11. 리스크 및 대응 방안

<!-- CHANGED: 리스크(일정, LLM정확도, 인력/역할, 테스트/QA, 프롬프트/데이터 거버넌스, 장애, 기존시스템 호환 등) 및 대응방안 신설 -->

| # | 리스크 | 상세 | 대응 방안 |
|---|--------|------|-----------|
| 1 | 일정 지연 | 2~3 sprint 내 Core MVP 완결 불확실, 실제 3~5주 소요 가능성 | 마일스톤별 중간점검, 기능별 스플릿, 범위 조정 |
| 2 | CQ 5축 "온톨로지 활용도" 평가 불명확 | MVP 임시정의(4-Asset Model 활용률)로 한시 운영, 5축 미달시 4축만 평가 | 오픈이슈·audit_events에 명시, Phase 4+에서 대체 |
| 3 | HITL 워크플로우 역할/권한/입력 오류 | 각 단계별 입력필드·권한·트레이스 분리, RBAC·ID·timestamp 기록 | QA/테스트케이스별 검증, 롤백 플랜 사전 마련 |
| 4 | LLM 자동평가 정확도 미달(80% 미만) | 단일 Sonnet 4.6 평가 한계 | 프롬프트/에이전트 구조 개선, 사후 검증 샘플 증대, fallback(사람 검수) |
| 5 | Cloudflare Workers CPU 시간 제한 | 60초 응답 vs Workers CPU 50ms 제한 충돌 가능 (DeepSeek 지적) | 평가 에이전트 별 Worker 격리 + Cloudflare KV 점수 캐싱 + 평가 작업 분할 |
| 6 | Anthropic API Rate Limit (429) | 평가 에이전트 폭주 시 외부 LLM 호출 한계 | Retry-After 헤더 처리 + 임시 큐 폴백 + 분당 호출수 모니터링 |
| 7 | D1 schema FK 회귀 | 신규 cq_evaluations / hitl_queue 테이블의 graph_sessions FK 영향 (오픈이슈 #5) | sprint Plan 단계 db review 필수 + 마이그레이션 롤백 SQL 사전 작성 + 기존 graph_sessions 회귀 테스트 |
| 8 | F606/F607 토대 회귀 | Audit Log Bus 또는 윤리 임계 토대 작동 변경 가능성 | 기존 토대 e2e smoke 사전/사후 비교 + trace_id chainValid 모니터링 + 회귀 발견 시 hotfix-forward |
| 9 | 사용자 채택 저항 / 학습 곡선 | CQ 5축 + 80-20-80 개념을 컨설턴트들이 내재화하는데 시간 소요 (Gemini 지적) | 사용자 교육 + 온보딩 워크숍 + "좋은 CQ vs 나쁜 CQ" 가이드 매뉴얼 사전 배포 + 점진적 도입 |
| 10 | HITL Console UI ↔ admin-portal 충돌 | React Router 7 동적 라우팅 + CSS namespace 충돌 가능 (DeepSeek 지적) | 별 라우트 namespace + CSS module 격리 + sprint 시동 전 frontend 결정 (오픈이슈 #3) |

---

## 12. 다음 단계 (Phase 6 SPEC/Sprint 등록 준비)

본 PRD 착수 판정(스코어카드 ≥ 80) 이후:

1. **prd-final.md 생성** (Phase 5 정리)
2. **SPEC.md §5 F-item 등록** — F662(또는 다음 사용 가능 번호)부터 4 F-item 등록:
   - F662 CQ 5축 평가 엔진 + 90점 핸드오프 (Must Have #1+#2)
   - F663 80-20-80 HITL 워크플로우 + 5-state 머신 (Must Have #3)
   - F664 HITL Console UI + 검수 큐 (Must Have #4)
   - F665 CQ 작성 가이드 + AI 금지 강제 (Must Have #5)
3. **Sprint 배정** — Sprint 396~398 (3 sprint, Core MVP), Phase 2 백로그는 Sprint 399+
4. **/pdca plan {feature}** — F662부터 sprint Plan 문서 작성

---

*이 문서는 `/ax:req-interview` 스킬에 의해 자동 생성 및 관리됩니다.*