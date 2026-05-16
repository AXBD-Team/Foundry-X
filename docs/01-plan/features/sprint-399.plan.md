---
code: FX-PLAN-399
title: F665 CQ 작성 가이드 + AI 금지 강제 + Dogfood seed (gap fill 6회차)
version: 1.0
status: Active
category: Plan
phase: 47
sprint: 399
f_items:
  - F665
req:
  - FX-REQ-727
priority: P0
created: 2026-05-16
session: S362
---

# Sprint 399 — F665 CQ 작성 가이드 + AI 금지 강제 + Dogfood seed (gap fill)

## §1 컨텍스트

S361 ServerKit Native PRD-final §4.1 #5 진행. **S362 단일 세션 4 sprint 연속 도전** (S360 2 sprint → S362 3 sprint → 4 sprint 갱신 예정). **사전 측정 (S362, fs 실측 29회차, gap fill 6회차)**.

### 기존 baseline (F632 + ServerKit Native PRD)

- `/api/cq/register` endpoint **이미 동작** (F632 era):
  - schemas: `RegisterCQSchema { orgId, questionText, answerText, author }`
  - author: `z.string().min(1)` enforced
  - D1: `cq_questions.author TEXT NOT NULL` enforced
- `docs/specs/fx-serverkit-native/` 디렉토리 **풍부** (S361 PRD 완성):
  - prd-final.md (28KB) — End User = AX BD 컨설턴트 7 + admin 3 정의
  - interview-log.md + review-history.md + archive 16 files

### F665 진정 gap (4종)

| # | gap | 해소 |
|---|-----|------|
| (1) | `cq-authoring-guide.md` 매뉴얼 부재 | docs 신규 (좋은 CQ vs 나쁜 CQ + End User + 작성 패턴 + 안티 패턴) |
| (2) | AI 생성 차단 가드 부재 — author validation은 1자 이상만 enforced | `/register` endpoint에 reserved AI 패턴 차단 (regex blocklist) + audit-bus emit |
| (3) | `.claude/rules/serverkit-cq.md` 부재 (Claude Code AI hook 차단) | rules 신규 — AI 생성 CQ 차단 + author 검증 절차 |
| (4) | Dogfood 사전 CQ 5건 등록 부재 | seed script 또는 D1 INSERT (KOAMI 또는 Decode-X 도메인) |

## §2 사전 측정 (fs 실측 29회차)

```
docs/specs/fx-serverkit-native/ 16 files (PRD-final + archive + reviews)
/api/cq/register endpoint 동작: schemas/cq.ts RegisterCQSchema + routes/index.ts:19 + cq_questions.author NOT NULL
.claude/rules/ 디렉토리 — security.md, sdd-triangle.md, tdd-workflow.md 등 8 rules 존재
Latest D1 migration: 0156_hitl_queue_state_machine.sql (F663 직후)
F662~F664 모두 ✅ MERGED (의존 충족)
```

## §3 범위 (Full gap fill)

### (a) `docs/specs/fx-serverkit-native/cq-authoring-guide.md` 신규 (~150L)

내용:
1. **End User 정의** (PRD-final §3 흡수): AX BD 컨설턴트 7 + admin 3, Sinclair Seo 등 명시
2. **CQ란?** Closure Question — graph_session 종결 시점 5축 평가의 reference question
3. **좋은 CQ 예시 3건** (KOAMI / Decode-X / 사내 BD 도메인)
4. **나쁜 CQ 예시 3건** + 안티 패턴 (모호함 / 측정 불가 / AI 답변 의존)
5. **5축별 작성 가이드** (ontology_usage 25% / tool_selection 20% / code_quality 15% / result_match 30% / governance 10%)
6. **AI 금지 정책** — author 필드는 사람만 작성, AI 도구 사용 시 거부
7. **Dogfood 사전 CQ 5건** 목록 + 등록 절차

### (b) `/api/cq/register` AI 생성 차단 가드

```typescript
// packages/api/src/core/cq/routes/index.ts:19~ 수정
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_]?/i;

cqApp.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterCQSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { orgId, questionText, answerText, author } = parsed.data;

  // F665: AI 생성 차단
  if (AI_AUTHOR_BLOCKLIST.test(author)) {
    return c.json({ error: "AI-authored CQ rejected", author }, 400);
  }
  // 본문 길이 검증 (minimum 50자 — AI 짧은 답변 회피)
  if (questionText.length < 50 || answerText.length < 50) {
    return c.json({ error: "CQ too short (min 50 chars each)" }, 400);
  }

  // ... 기존 INSERT 로직 ...

  // audit-bus emit (F606)
  const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
  await auditBus.emit("cq.registered", { id, orgId, author, questionText: questionText.slice(0, 100) }, ctx);

  return c.json({ id }, 200);
});
```

### (c) `.claude/rules/serverkit-cq.md` 신규 (~80L)

내용:
1. **목적** — ServerKit Native CQ 작성 시 AI 생성 금지 + 사람 작성 강제
2. **CQ 작성자 자격** — AX BD 컨설턴트 + admin만 (HitlRole 별모델 — CQ는 사람 작성, HITL은 사람 검수)
3. **Claude Code 호출 시 차단 룰**:
   - 사용자 prompt에 "CQ 작성해줘" 또는 "register a CQ" 감지 시 거부
   - 거부 메시지: "CQ는 사람 작성 강제 — `docs/specs/fx-serverkit-native/cq-authoring-guide.md` 참조"
4. **/register API 호출 시 author 패턴 검증** — AI_AUTHOR_BLOCKLIST regex 명시
5. **연관 룰**: `tdd-workflow.md`, `security.md` 등 cross-link

### (d) Dogfood 5건 seed

```typescript
// packages/api/src/db/migrations/0157_dogfood_cq_seed.sql (또는 별 SQL script)
INSERT INTO cq_questions (id, org_id, question_text, answer_text, answer_locked_at, author)
VALUES
  ('dogfood-cq-001', 'demo-org-001', '...', '...', strftime('%s','now')*1000, 'Sinclair Seo'),
  -- ... 5건
```

5건 도메인: KOAMI (3건) + Decode-X (2건). 각각 5축 점수 측정 가능한 reference question + answer 작성.

### (e) Integration test

- `packages/api/src/core/cq/__tests__/cq-register-ai-block.test.ts` (~80L)
  - T1: AI author ("ai-claude") → 400
  - T2: 정상 author ("Sinclair Seo") → 200 + audit emit
  - T3: 짧은 questionText (< 50자) → 400
  - T4: Dogfood seed 5건 SELECT → 5 rows

## §4 구현 단계

1. **Red**: cq-register-ai-block.test.ts 작성 (T1~T4 FAIL)
2. **Green Step 1**: routes/index.ts AI_AUTHOR_BLOCKLIST + 검증 로직
3. **Green Step 2**: cq-authoring-guide.md 매뉴얼 작성
4. **Green Step 3**: .claude/rules/serverkit-cq.md 작성
5. **Green Step 4**: Dogfood 5건 seed migration 0157 또는 SQL
6. typecheck + test GREEN
7. PR + auto-merge

## §5 파일 매핑

### 신규
- `docs/specs/fx-serverkit-native/cq-authoring-guide.md` (~150L)
- `.claude/rules/serverkit-cq.md` (~80L)
- `packages/api/src/db/migrations/0157_dogfood_cq_seed.sql` (~30L, 5건 INSERT)
- `packages/api/src/core/cq/__tests__/cq-register-ai-block.test.ts` (~80L)

### 수정
- `packages/api/src/core/cq/routes/index.ts` (+25L AI_AUTHOR_BLOCKLIST + 길이 검증 + audit emit)

### 산출물 (S362 학습 강제)
- `reports/sprint-399-cq-authoring-guide-snapshot.md` — 매뉴얼 핵심 발췌
- `reports/sprint-399-ai-author-blocked-samples.md` — AI 차단 3 케이스
- `docs/02-design/features/sprint-399.design.md` — autopilot
- `docs/04-report/features/sprint-399.report.md` — autopilot (S362 학습 강제)
- `docs/metrics/velocity/sprint-399.json` — autopilot (f_items "F665" 정확 + duration 정확, **5회차 답습 차단 강제**)

## §6 Out-of-scope

- **CQ 작성 web UI** — 본 sprint API + docs만, UI는 F666+ 또는 별 sprint
- **AI hook 차단 자동화** — `.claude/rules/serverkit-cq.md`는 문서 룰, Claude Code 강제 hook 코드는 별 작업
- **5축 정확도 정밀화** — 기존 MVP 임시정의 유지
- **Dogfood 실제 평가 실행** — 본 sprint는 seed만, 실제 CQEvaluator 호출은 별 작업

## §7 Phase Exit P-a~P-h

| # | 항목 | 판정 |
|---|------|------|
| P-a | cq-authoring-guide.md 매뉴얼 작성 + End User + 5축 가이드 + AI 금지 | docs 존재 + 150L+ |
| P-b | /register AI 차단 가드 동작 | T1 PASS (AI author 400) |
| P-c | 정상 author 통과 + audit emit | T2 PASS + audit_events row |
| P-d | 본문 길이 검증 | T3 PASS (< 50자 400) |
| P-e | .claude/rules/serverkit-cq.md 신규 | rules 존재 |
| P-f | Dogfood 5건 seed INSERT | migration 0157 적용 + T4 PASS |
| P-g | typecheck + msa-lint PASS (S337+S360) | 0 errors |
| P-h | dual_ai_reviews ≥ 1건 + **63 sprint streak** + ServerKit Native MVP 전완점 | F662~F665 모두 ✅ |

## §8 위험 + 대응

| 위험 | 확률 | 영향 | 대응 |
|------|-----|------|------|
| AI_AUTHOR_BLOCKLIST regex 회피 (예: "AI helper", "Bot Manager") | 중 | 낮음 | regex 보수적 + audit emit으로 audit 가능 |
| 본문 50자 길이 검증이 너무 엄격 | 낮음 | 낮음 | 한국어 50자는 합리적 (영어 200자+에 해당) |
| Dogfood 5건 도메인 선정 어려움 | 낮음 | 낮음 | KOAMI 3 + Decode-X 2 명시 |
| autopilot velocity stale 답습 5회차 재현 | **높음** | 낮음 | Plan §5 강제 + 5회차 임계 (post-merge fixup 정착) |
| autopilot report.md 누락 | 낮음 | 낮음 | F663+F664 효과 ✅ (S362 학습 패턴 정착) |

## §9 다음 사이클 후보 (out-of-scope)

- **velocity stale rules 즉시 승격** (4회→5회 임계 — script-level fix 필요)
- F647 sidebar Portal race fix
- F645 silent layer 7 fix
- W20 KPI 6/8 베이스라인 측정
- Cloudflare KV 점수 캐싱 PoC (PRD §11)
- ServerKit Native MVP Dogfood 1회 실 실행 (F662~F665 통합 검증)

## §10 메타 학습 (S362 누적)

- **Plan fs 실측 의무화 29회차 정착화 최고치**
- **gap fill 패턴 6회차 누적 정착화** (S280/S282/S362-F662/F663/F664/F665)
- **단일 세션 4 sprint 연속 도전 (전례 없는 패턴)** — S360 2 sprint → S362 3 sprint → 4 sprint 1.33배 갱신
- **63 sprint streak 도전** — S306~F664 = 62 baseline
- **ServerKit Native MVP 전완점 가능성** (F662~F665 단일 세션 완결 시)
- **F643 fix 효과 7회차 검증 기회**
