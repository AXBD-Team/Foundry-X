---
title: fx-serverkit-native — 인터뷰 로그
slug: fx-serverkit-native
date: 2026-05-16
session: S361
interviewer: Sinclair Seo (AX BD팀 리드)
mode: /ax:req-interview (Phase 1 인터뷰)
classification: 기업비밀II급
---

# 인터뷰 로그: fx-serverkit-native

**날짜:** 2026-05-16 (BeSir D-day 다음날, S361)
**진행:** AX BD팀
**진행 방식:** AskUserQuestion 기반 5 파트 구조화 인터뷰

---

## 0. 컨텍스트 (인터뷰 시작 전 사전 결정)

### 0.1 5/15 BeSir D-day 미팅 결과 (사용자 보고)

- **시연 미진행** — D-day로 잡혔던 5/15 미팅은 시연 없이 사업협력관계 논의 위주로 진행
- **ServerKit 연동 drop** — BeSir(서버키트) 외부 파트너 제품 연동 결정 폐기
- **자체구축 결정** — Foundry-X가 BeSir(ServerKit)의 컨셉을 자체적으로 구축

### 0.2 사전 흡수 컨셉 확정 (인터뷰 1차)

사용자 명시 흡수 대상 (AskUserQuestion multiSelect):

| # | 컨셉 | 사용자 결정 |
|---|------|------------|
| 1 | CQ(Critical Question) 5축 평가 + 80-20-80 HITL | ✅ 흡수 |
| 2 | 원본 DB 직결 + 자동화 상태 변경 정책 | ✅ 흡수 |
| 3 | 7-타입 온톨로지 (Fact/Dimension/Workflow/Event/Actor/Policy/Support, 12-노드 → 7-타입 압축) | ❌ 흡수 보류 (Phase 4+) |
| 4 | Graph/Vector DB 의도적 미사용 (파일+Git+PostgreSQL) | ❌ 흡수 보류 (현 D1+sqlite 영향 분리) |

### 0.3 참고 문서

- `docs/specs/ai-foundry-phase1/06_architecture_alignment_with_besir_v1.md` — 2026-04-29 BeSir × KT DS 미팅 정합성 분석 v1
- `docs/specs/ai-foundry-master-plan/06_architecture_alignment_with_besir_v1.md` — 동일 (master-plan 미러)

---

## 1. Part 1: 왜 (목적/문제)

### 핵심 질문
> "ServerKit 자체구축이 지금 시급한 이유(또는 자체구축 안 하면 생기는 문제)는 무엇인가요?"

### 답변
**AI Foundry P0 안건 unlock**

### 해석
- F600 (5-Layer 통합), F601 (Multi-Tenant + SSO), F625 (CQ 5축 운영 검증) 등 AI Foundry P0 idea-단계 F-item들이 BeSir 외부 의존 때문에 unblock 못한 상태
- ServerKit 자체구축으로 외부 의존을 제거하면 P0 안건들이 즉시 unlock 가능
- 시급성 = AI Foundry 로드맵 P0 unblock 즉시 (W19 이후 본격 진행 가능)

### 부속 결정
- 시연/PoC 일정 의존성 (KT DS 내부 영업 자료) = 본 PRD scope 외 (선택지에서 명시적 비선택)
- "장기 백로그" 분류도 비선택 — 즉시 P0 unlock 트랙

---

## 2. Part 2: 누구를 위해 (사용자/이해관계자)

### 핵심 질문
> "ServerKit native의 주 사용자는 누구인가요? (서비스 장단계에서 이 구조를 직접 쓰거나 상담하는 존재)"

### 답변
**AX BD팀 내부 컨설턴트** (7명 + admin 3명)

### 해석
- 주 사용자 = KT DS AX 컨설팅팀 7명 + admin 3명
- 운영 주체로서 CQ 5축 검증 / HITL 검수 / 원본 DB 자동화 트리거 진행
- 페르소나 1차 정의 (PRD §3에서 상세화):
  - **AX BD 컨설턴트** (Subject Matter Expert) — 컨설팅 워크플로우의 도메인 전문가
  - **AX BD admin** (Operator) — 운영/관리, RBAC Admin 역할
- 기타 후보(고객사 운영자, AI 자동화 에이전트, 본부별 Approver)는 비선택 — Phase 2+ 또는 별 PRD에서 검토

### 사용 환경
- 기기: PC (사내망)
- 네트워크: 사내망 (Cloudflare Workers 통해 외부 SaaS)
- 기술 수준: 컨설턴트 (비개발자 또는 도메인 전문가)

---

## 3. Part 3: 무엇을 (범위/기능)

### 핵심 질문
> "MVP 범위를 어느 수준까지 잡을까요? (시급성 = AI Foundry P0 unlock 기준)"

### 답변
**Core (CQ 5축 + 80-20-80 HITL) ~2~3 sprint**

### 해석
- MVP (Must Have) = CQ 5축 평가 엔진 + 80-20-80 HITL 워크플로우 (5단계 흐름)
- Phase 2 백로그 (Should Have) = 원본 DB 직결 + 자동화 상태 변경 정책
- Out-of-scope = 7-타입 온톨로지 흡수 (Phase 4+), Graph/Vector DB 미사용 흡수 (Phase 4+)
- 예상 일정 = 2~3 sprint (Core MVP 단계)

### 기능 세부 (PRD §4에서 상세화)
- **CQ 5축 평가 엔진** — 5축(예: Consistency / Completeness / Correctness / Clarity / Confidence) 자동 평가 + 점수 저장 (D1 schema 추가)
- **80-20-80 HITL 워크플로우** — AI 80% 자동 평가 → 사람 20% 검수 → AI 80% 최종 → 사람 최종 팔식
- **HITL Console UI** — 검수 큐 + 5단계 흐름 시각화 + 의사결정 입력
- **AI Foundry 통합** — F606 Audit Log Bus + F607 윤리 임계 토대 활용

---

## 4. Part 4: 어떻게 판단할 것인가 (성공 기준)

### 핵심 질문
> "ServerKit native MVP가 성공했다는 걸 어떻게 알 수 있을까요? (시급성 = AI Foundry P0 unlock 기준으로 정량 지표)"

### 답변
**AI Foundry P0 unlock + Dogfood 1회 PASS**

### 해석 (성공 기준 3축)
1. **F625 CQ 5축 운영 검증 ✅ MERGED** — SPEC §5 F625 row 상태 idea → impl → review → ✅
2. **F600 5-Layer 통합 unlock** — F600 idea 단계에서 design/impl 단계로 이동 가능한 상태 도달
3. **Dogfood 1회 PASS** — KOAMI 또는 Decode-X 실제 컨설팅 세션에서 CQ 자동 평가 + 80-20-80 4단계 차수 완결한 graph_session 1건 이상

### MVP 최소 기준 (Phase Exit Reality)
- Core MVP 2~3 sprint 완결 + Dogfood 1회 session_id 증거 기록
- 비기능 요구사항: F606 Audit Log Bus trace_id 전파 정상 (이미 ✅ MERGED 토대 활용)

### 실패/중단 조건
- Dogfood 0건 또는 graph_session 미완결 → MVP 재정의 필요
- F606/F607 토대 미작동 → ServerKit native 진행 불가, 토대 재진단 우선

---

## 5. Part 5: 제약과 리소스 (현실 조건)

### 핵심 질문
> "ServerKit native 구축의 기술 제약/외부 의존은 어떻게 할까요?"

### 답변
**기존 Foundry-X 스택 100% 활용, 추가 인프라 0**

### 해석
- **기술 스택** (Foundry-X 기존 활용)
  - 프론트엔드: Vite 8 + React 18 + React Router 7 + Zustand
  - 백엔드: Hono + Cloudflare Workers + D1
  - LLM: Claude Sonnet 4.6 (SSOT MODEL_SONNET)
  - 기존 토대: F606 (Audit Log Bus) + F607 (윤리 임계) ✅ MERGED
- **인프라 추가 0** — PG 도입(F601) 분리 트랙, 본 PRD에서 배제
- **외부 LLM 벤더 추가 0** — Sonnet 4.6 단일 모델
- **인력** — AX BD팀 7명 + admin 3명 내부
- **예산** — 외부 비용 0 (BeSir 라이센스/연동비 폐기)
- **컴플라이언스** — 기업비밀II급 (BeSir 정합성 분석 분류 적용)
- **외부 승인** — 5/15 사업협력 결정으로 별도 외부 승인 0

### 부속 결정
- F601 PG 도입은 별 트랙 (본 PRD에서 의존 0 보장)
- 외부 LLM 벤더 추가 (OpenAI/Gemini) 비선택 — Sonnet 4.6 SSOT 유지

---

## 6. 인터뷰 마무리

### 사용자 최종 확인 응답
> "웅 진행 — PRD 작성 시작 (Recommended)"

### Phase 2 옵션
- Phase 2 (3-AI 검토) → 진행
- Phase 2b (Six Hats 토론) → 추후 선택 (현 라운드는 미선택)

### 다음 단계
1. ✅ `interview-log.md` 작성 (본 문서)
2. 🔄 `prd-v1.md` 작성 (PRD 템플릿 기반)
3. → Phase 2: 3-AI 검토 (review-api.mjs)
4. → Phase 3: 검토의견 자동 반영
5. → Phase 4: 충분도 평가 (스코어카드 + Ambiguity Score)
6. → Phase 5: 정리 (prd-final.md + archive)
7. → Phase 6: SPEC F-item 등록 + Sprint 배정

---

## 7. 메타 학습 (S361 인터뷰 패턴 28회차 정착화)

- **사용자 컨텍스트 사전 풍부**: 5/15 결과 + 4개 흡수 컨셉을 인터뷰 진입 전 multiSelect로 사전 결정 → 5 파트 인터뷰가 5분 내 완결 (인터뷰 트리 "25분 제한" 충족)
- **인터뷰 패턴 28회차**: AskUserQuestion 단일 질문 + 4 option (1 Recommended) + 자유입력 fallback. interaction-patterns.md 준수
- **fs 실측 사전 의무화** (S283 rule 26회차): docs/specs/ai-foundry-phase1/06_architecture_alignment_with_besir_v1.md 사전 확인 + ServerKit/서버키트 grep으로 정확한 BeSir 컨텍스트 확보
