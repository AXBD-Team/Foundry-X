---
code: FX-DOC-399
title: CQ 작성 가이드 — Closure Question 사람 작성 표준
version: 1.0
status: Active
category: Guide
created: 2026-05-16
updated: 2026-05-16
author: Sinclair Seo
---

# CQ 작성 가이드 (Closure Question Authoring Guide)

> Foundry-X ServerKit Native MVP — AX BD 컨설턴트 전용 CQ 작성 표준

## §1 End User 정의

CQ를 작성·검수·활용하는 대상은 다음과 같아요:

| 역할 | 인원 | 설명 |
|------|------|------|
| AX BD 컨설턴트 | 7명 | 실제 BD 프로젝트를 담당하는 주 작성자 |
| Admin | 3명 (Sinclair Seo 포함) | CQ 품질 검수 + 시스템 관리 |

**CQ 작성 자격**: AX BD 컨설턴트 + Admin만 등록 가능. 외부 계약자·인턴·AI 도구 작성 금지.

## §2 CQ란? (Closure Question 개념)

**Closure Question(CQ)**는 BD graph_session이 종결되는 시점에 AI 에이전트의 작업 품질을 평가하기 위한 reference question-answer 쌍이에요.

```
graph_session 종결
    ↓
CQ 5축 평가 (CQEvaluator)
    ↓
총점 계산 (100점 만점)
    ↓
90점 이상 → handoff (AI 자율 처리)
90점 미만 → human_review (사람 개입)
```

### 5축 구성

| 축 | 가중치 | 설명 |
|----|-------|------|
| `ontology_usage` | 25% | 4-Asset Model(Entity/Relationship/Attribute/Event) 활용도 |
| `tool_selection` | 20% | 적절한 AI 도구·API 선택 여부 |
| `code_quality` | 15% | 코드 품질·구조·가독성 |
| `result_match` | 30% | 목표 대비 결과 달성도 |
| `governance` | 10% | 데이터 거버넌스·규정 준수 |

## §3 좋은 CQ 예시 3건

### 예시 1 — KOAMI 경쟁사 분석 (ontology_usage 중심)

**questionText**:
> KOAMI 프로젝트에서 4-Asset Model의 Entity·Relationship·Attribute를 모두 활용하여 국내 경쟁사 5개 기업의 시장 점유율 변화를 분석하고, Foundry-X 온톨로지 그래프로 시각화했나요?

**answerText**:
> KOAMI 분석에서 Entities(경쟁사 5곳: A사, B사, C사, D사, E사), Relationships(시장 점유율 증감 방향, 제품 라인 중복 여부), Attributes(연간 매출, 제품 가격대, 고객 세그먼트), Events(신제품 출시, M&A 발표)를 4-Asset Model로 완전히 구조화했어요. graph_session 결과물로 Foundry-X 온톨로지 시각화 보고서 1건이 생성되었고, 경영진 검토에서 활용 가능한 수준의 정확도를 달성했습니다.

**예상 점수**: ontology_usage ~90 / result_match ~85 / 총 ~88점

---

### 예시 2 — Decode-X 기술 스택 평가 (tool_selection 중심)

**questionText**:
> Decode-X 고객사의 레거시 모놀리식 시스템을 마이크로서비스 아키텍처로 전환하는 BD 제안서를 작성할 때, Foundry-X의 어떤 AI 도구를 선택했으며 그 이유는 무엇인가요?

**answerText**:
> Decode-X 제안서 작성 시 (1) discovery-stage-runner로 기술 부채 발굴 — LLM 기반 자동 인터뷰 3회 수행, (2) CQEvaluator로 제안 품질 사전 검증 — 5축 중 tool_selection·code_quality 집중 평가, (3) HitlQueue로 최종 인간 검수 — 아키텍처 결정 2건 에스컬레이션. 선택 이유: 레거시 시스템 분석은 LLM의 컨텍스트 이해 능력이 핵심이며, 마이크로서비스 경계 결정은 인간 판단이 필요한 영역으로 80-20-80 HITL 원칙에 부합합니다.

**예상 점수**: tool_selection ~92 / governance ~85 / 총 ~88점

---

### 예시 3 — 사내 BD 거버넌스 (governance 중심)

**questionText**:
> AX BD팀의 분기별 KPI 달성 현황을 Foundry-X로 분석하고, 데이터 출처·보안 분류·접근 권한을 명확히 기록한 거버넌스 보고서를 작성했나요?

**answerText**:
> 분기 KPI(계약 성사율 35%, 제안서 품질 점수 88점 평균, 고객 만족도 4.2/5.0)를 Foundry-X audit-bus 이벤트 로그에서 추출하여 분석했어요. 데이터 출처: D1 DB audit_events 테이블 (내부 기밀, 접근 권한: admin + BD리드). 보안 분류: 사내 한정 배포. RBAC 기반으로 팀원 접근을 orgId로 격리했으며, 개인정보(고객사명)는 해시 처리 후 기록했습니다.

**예상 점수**: governance ~95 / result_match ~88 / 총 ~87점

## §4 나쁜 CQ 예시 3건 + 안티 패턴

### 나쁜 예시 1 — 모호한 질문 ❌

**questionText**: "AI가 잘 했나요?"

**문제점**: 
- 측정 가능한 기준 없음
- 5축 중 어느 축도 평가할 수 없음
- 50자 미만 → API 차단

**수정 방향**: 특정 결과물·지표·비교 기준을 명시할 것

---

### 나쁜 예시 2 — 측정 불가 답변 ❌

**questionText**:
> Foundry-X가 이번 프로젝트에서 훌륭한 성과를 냈나요? AI의 결과물이 좋았나요?

**answerText**: "네, 매우 좋았어요. 팀이 만족했습니다."

**문제점**:
- 주관적 만족도 → 수치·증거 없음
- "훌륭한"·"좋은"의 기준 미정의
- LLM이 채점할 객관적 근거 없음

**수정 방향**: "계약 성사", "보고서 페이지 수", "에스컬레이션 건수" 등 수치 기준 명시

---

### 나쁜 예시 3 — AI 답변 의존 ❌

**questionText**:
> AI가 결과물을 잘 생성했는지 AI가 스스로 평가해줄 수 있나요?

**answerText**: "CQEvaluator에게 물어보세요. AI가 평가해줄 거예요."

**문제점**:
- **자기 참조적 평가** — AI가 AI를 평가하는 순환 논리
- CQ의 핵심 목적(사람 기준 BD 품질 검증)을 무력화
- 이 패턴 발견 시 CQ를 즉시 폐기하고 재작성할 것

## §5 5축별 작성 가이드

### ontology_usage (25%) — 온톨로지 활용도

**좋은 작성 패턴**:
- "4-Asset Model의 Entity·Relationship·Attribute·Event 각각을 명시"
- "Foundry-X 온톨로지 그래프에 몇 개 노드/엣지가 생성됐는지 수치 포함"
- "활용하지 않은 Asset 유형이 있다면 그 이유 설명"

**체크리스트**:
- [ ] 4-Asset Model 중 최소 3개 유형 활용 여부
- [ ] 결과물(보고서·그래프)에 온톨로지 구조 반영 여부
- [ ] Domain-specific 엔티티 명시 여부

---

### tool_selection (20%) — 도구 선택

**좋은 작성 패턴**:
- "어떤 Foundry-X 서비스(discovery-stage-runner/CQEvaluator/HitlQueue)를 왜 선택했는지 명시"
- "대안 도구를 검토하고 배제한 이유 포함"

**체크리스트**:
- [ ] 선택한 AI 도구 명시 (2개 이상)
- [ ] 선택 근거(성능·적합성) 포함
- [ ] 미사용 도구와의 비교 포함

---

### code_quality (15%) — 코드 품질

**좋은 작성 패턴**:
- "생성된 코드의 typecheck PASS 여부"
- "ESLint 위반 건수"
- "테스트 커버리지 %"

**체크리스트**:
- [ ] 수치 기반 품질 지표 포함
- [ ] 구체적인 코드 패턴·구조 설명

---

### result_match (30%) — 결과 달성도

**좋은 작성 패턴**:
- "초기 목표 KPI vs 실제 달성 수치 대조"
- "미달성 항목과 원인 명시"

**체크리스트**:
- [ ] 초기 목표와 결과를 병렬 비교
- [ ] 달성/미달성 구분 명확
- [ ] 수치·증거(로그·보고서 파일명) 포함

---

### governance (10%) — 거버넌스

**좋은 작성 패턴**:
- "데이터 출처·분류·접근 권한 명시"
- "RBAC orgId 격리 여부"
- "개인정보 처리 방법"

**체크리스트**:
- [ ] 데이터 출처 명시
- [ ] 보안 분류(사내 한정/대외비 등) 포함
- [ ] 접근 권한 설명

## §6 AI 금지 정책

> **CQ는 반드시 사람이 작성해야 해요. AI 도구로 생성된 CQ는 `author` 필드 검증 시 자동 차단됩니다.**

### 차단 대상 author 패턴

API `/api/cq/register`는 아래 정규식으로 AI 작성자를 차단해요:

```
/^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i
```

**차단 예시**: `ai-claude`, `bot`, `ChatGPT`, `gpt-4`, `openai-assistant`

**허용 예시**: `Sinclair Seo`, `홍길동`, `BD팀 컨설턴트`

### 왜 AI 작성이 금지되나요?

1. **자기 참조적 평가 무력화**: AI가 AI를 평가하면 편향된 높은 점수가 나올 수 있어요
2. **BD 전문성 손실**: CQ는 실제 BD 경험에서 나온 질문이어야 해요
3. **사람 기준 유지**: 80-20-80 HITL 원칙 — AI가 80% 처리하더라도 품질 기준은 사람이 정해요

### 올바른 사용법

```bash
# ✅ 올바른 등록
curl -X POST /api/cq/register \
  -d '{"orgId":"demo-org-001","author":"Sinclair Seo","questionText":"...","answerText":"..."}'

# ❌ 차단됨
curl -X POST /api/cq/register \
  -d '{"orgId":"demo-org-001","author":"claude","questionText":"...","answerText":"..."}'
# → 400 {"error":"AI-authored CQ rejected","author":"claude"}
```

## §7 Dogfood 사전 CQ 5건 + 등록 절차

### 사전 등록된 Dogfood CQ

| ID | 도메인 | 핵심 평가 축 |
|----|-------|------------|
| dogfood-cq-001 | KOAMI — 경쟁사 분석 | ontology_usage + result_match |
| dogfood-cq-002 | KOAMI — 시장 규모 측정 | result_match + governance |
| dogfood-cq-003 | KOAMI — 파트너십 기회 | tool_selection + ontology_usage |
| dogfood-cq-004 | Decode-X — 기술 스택 평가 | tool_selection + code_quality |
| dogfood-cq-005 | Decode-X — 보안 취약점 분석 | governance + result_match |

위 5건은 D1 migration `0157_dogfood_cq_seed.sql`로 자동 등록돼요.

### 신규 CQ 등록 절차

1. **작성**: 위 §3 좋은 CQ 예시 패턴 참조
2. **검증**: questionText/answerText 각각 50자 이상 확인
3. **등록**: POST `/api/cq/register` with `author` = 실명
4. **검수**: Admin(Sinclair Seo)이 품질 검토 후 승인
5. **활용**: 다음 graph_session 종결 시 CQEvaluator가 자동 참조
