---
code: FX-DESIGN-399
title: F665 CQ 작성 가이드 + AI 금지 강제 + Dogfood seed (gap fill 6회차)
version: 1.0
status: Active
category: Design
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

# Sprint 399 Design — F665 CQ 작성 가이드 + AI 금지 강제

## §1 요약

F632 baseline (`/api/cq/register`) 위에 3종 gap 해소: (b) AI 생성 차단 + 길이 검증 가드, (a) 매뉴얼 `cq-authoring-guide.md`, (c) `.claude/rules/serverkit-cq.md`, (d) Dogfood 5건 seed migration 0157, (e) integration test T1~T4.

## §2 데이터 플로우

```
Client POST /api/cq/register
  → AI_AUTHOR_BLOCKLIST.test(author) → 400 if match
  → questionText.length < 50 || answerText.length < 50 → 400
  → D1 INSERT cq_questions
  → auditBus.emit("cq.registered", payload, ctx)
  → 200 { id }
```

## §3 테스트 계약 (TDD Red Target)

### `packages/api/src/core/cq/__tests__/cq-register-ai-block.test.ts`

| 테스트 ID | 시나리오 | 기대 결과 |
|-----------|----------|-----------|
| T1 | author = "ai-claude" | HTTP 400 + error "AI-authored CQ rejected" |
| T2 | author = "Sinclair Seo", 정상 50자+ 텍스트 | HTTP 200 + { id } + audit emit |
| T3 | questionText.length < 50 | HTTP 400 + error "CQ too short" |
| T4 | D1 cq_questions SELECT WHERE author="Sinclair Seo" | rows.length >= 5 (Dogfood seed) |

## §4 AI_AUTHOR_BLOCKLIST 설계

```typescript
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i;
```

- 대소문자 무관 (`i` flag)
- 접미사 허용: `ai-`, `ai_`, `ai ` 등 모두 차단
- "Sinclair AI" 같은 성명 포함 케이스는 prefix가 아니므로 통과 (보수적 설계)
- audit emit: 차단 시에도 audit_events에 기록 (감사 trail)

## §5 파일 매핑

### 신규 파일

| 파일 | 설명 | 크기 |
|------|------|------|
| `docs/specs/fx-serverkit-native/cq-authoring-guide.md` | End User CQ 작성 가이드 (매뉴얼) | ~150L |
| `.claude/rules/serverkit-cq.md` | Claude Code AI 생성 CQ 차단 룰 | ~80L |
| `packages/api/src/db/migrations/0157_dogfood_cq_seed.sql` | Dogfood CQ 5건 INSERT | ~40L |
| `packages/api/src/core/cq/__tests__/cq-register-ai-block.test.ts` | T1~T4 통합 테스트 | ~80L |
| `reports/sprint-399-cq-authoring-guide-snapshot.md` | 매뉴얼 핵심 발췌 산출물 | ~50L |
| `reports/sprint-399-ai-author-blocked-samples.md` | AI 차단 3 케이스 산출물 | ~30L |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/cq/routes/index.ts` | AI_AUTHOR_BLOCKLIST + 길이 검증 + audit emit (+25L) |

### autopilot 생성 산출물

| 파일 | 내용 |
|------|------|
| `docs/02-design/features/sprint-399.design.md` | 본 파일 |
| `docs/04-report/features/sprint-399.report.md` | Sprint 완료 보고서 |
| `docs/metrics/velocity/sprint-399.json` | velocity 지표 (f_items="F665", duration 정확) |

## §6 D1 마이그레이션

Migration `0157_dogfood_cq_seed.sql`: 5건 INSERT (KOAMI 3건 + Decode-X 2건). 각 CQ:
- `questionText` ≥ 50자 + `answerText` ≥ 50자
- `author` = "Sinclair Seo" (AI_AUTHOR_BLOCKLIST 통과)
- `org_id` = "demo-org-001"
- `answer_locked_at` = 현재 시각 ms

## §7 audit-bus 연동

기존 `AuditBus` + `generateTraceId/generateSpanId` 패턴 (F642 baseline):

```typescript
import { generateTraceId, generateSpanId } from "../../infra/audit-bus.service.js";

const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
await bus.emit("cq.registered", { id, orgId, author, questionText: questionText.slice(0, 100) }, ctx);
```

단, `getServices()` 함수 내 `bus`가 이미 초기화되어 있으므로 재사용.

## §8 Out-of-scope

- CQ 작성 web UI
- AI hook 차단 자동화 (Claude Code 강제 hook 코드)
- 5축 정확도 정밀화
- Dogfood 실제 CQEvaluator 호출
