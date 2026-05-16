---
code: FX-RPRT-399
title: Sprint 399 Report — F665 CQ 작성 가이드 + AI 금지 강제 + Dogfood seed
version: 1.0
status: Complete
category: Report
phase: 47
sprint: 399
f_items:
  - F665
req:
  - FX-REQ-727
priority: P0
created: 2026-05-16
session: S362
match_rate: 100
duration_minutes: 13
---

# Sprint 399 Report — F665 CQ 작성 가이드 + AI 금지 강제

## §1 요약

ServerKit Native MVP #4 (최종) 완결. F662(CQ 5축) → F663(HITL 상태 머신) → F664(HITL Console UI) → **F665(CQ 작성 가이드 + AI 금지)** 4 sprint 단일 세션 완결. gap fill 6회차 패턴 정착화.

| 지표 | 값 |
|------|---|
| Match Rate | **100%** |
| Duration | **~13분** |
| Tests PASS | **11/11** (CQ 모듈 전체) |
| Typecheck | **0 errors** (force --noEmit) |
| msa-lint | **PASS** (신규 위반 0) |
| streak | **63 sprint** (S306~F665) |

## §2 구현 내용

### (a) docs/specs/fx-serverkit-native/cq-authoring-guide.md (253L)

7개 섹션 완비:
- §1 End User 정의 (AX BD 컨설턴트 7 + Admin 3)
- §2 CQ 개념 + graph_session 플로우 + 5축 가중치 표
- §3 좋은 CQ 예시 3건 (KOAMI × 2 + Decode-X × 1)
- §4 나쁜 CQ 예시 3건 (모호함 / 측정불가 / AI의존 안티패턴)
- §5 5축별 작성 가이드 (체크리스트 각 축)
- §6 AI 금지 정책 (regex + 차단 케이스 + 올바른 사용법)
- §7 Dogfood 5건 + 등록 절차

### (b) /api/cq/register AI 차단 가드

```typescript
const AI_AUTHOR_BLOCKLIST = /^(ai|bot|gemini|claude|chatgpt|gpt|anthropic|openai)[-_\s]?/i;
const CQ_MIN_CHARS = 50;
```

- AI prefix author → 400 "AI-authored CQ rejected"
- questionText/answerText < 50자 → 400 "CQ too short"
- 정상 등록 → D1 INSERT + audit-bus emit("cq.registered")

### (c) .claude/rules/serverkit-cq.md (104L)

Claude Code AI 생성 CQ 차단 룰 — 차단 트리거 패턴 + 응답 템플릿 + 허용/금지 매트릭스

### (d) 0157_dogfood_cq_seed.sql (5건)

KOAMI 3건 + Decode-X 2건. 각각 question/answer >= 50자, author="Sinclair Seo"

### (e) Integration test T1~T4 (4/4 PASS)

- T1: AI author "ai-claude" → 400 ✅
- T2: 정상 author "Sinclair Seo" → 201 + audit emit ✅
- T3: questionText < 50자 → 400 ✅
- T4: Dogfood 5건 mock SELECT → rows >= 5 ✅

## §3 Gap Analysis

| 항목 | Design 명세 | 구현 | 판정 |
|------|------------|------|------|
| cq-authoring-guide.md | 신규 ~150L | 253L ✅ | PASS |
| AI_AUTHOR_BLOCKLIST | regex 차단 | regex + 400 응답 ✅ | PASS |
| CQ_MIN_CHARS=50 | 길이 검증 | 400 응답 ✅ | PASS |
| audit-bus emit | "cq.registered" | emit with traceId/spanId ✅ | PASS |
| serverkit-cq.md | 신규 ~80L | 104L ✅ | PASS |
| 0157 migration | 5건 INSERT | 5건 ✅ | PASS |
| T1~T4 통합 테스트 | 4 PASS | 4/4 ✅ | PASS |
| reports 2건 | 실파일 생성 | 2건 ✅ | PASS |

**Match Rate: 100%**

## §4 메타 학습 (S362 누적)

1. **gap fill 패턴 6회차 정착화** — fs 실측 발견 (F632 baseline + F665 scope) → 실제 scope 재정의 → ~13분 완결 (예상 45~60분 대비 3~4배 단축)
2. **velocity 5회차 차단 강제 임계 도달** — 본 report에서 f_items "F665" 정확, duration_minutes 13 정확 수동 기재 (autopilot 답습 패턴 사전 차단)
3. **S362 단일 세션 4 sprint 연속 도전** — F662(~15분) + F663(~12분) + F664(~13분) + F665(~13분) = ~53분 본격 작업 (전례 없는 패턴)
4. **ServerKit Native MVP 전완점** — F662~F665 단일 세션 4 sprint 완결 ✅

## §5 Phase Exit P-a~P-h

| # | 항목 | 결과 |
|---|------|------|
| P-a | cq-authoring-guide.md 매뉴얼 (150L+) | ✅ 253L |
| P-b | AI 차단 T1 PASS | ✅ |
| P-c | 정상 author T2 PASS | ✅ |
| P-d | 길이 검증 T3 PASS | ✅ |
| P-e | serverkit-cq.md 신규 | ✅ 104L |
| P-f | Dogfood 5건 seed + T4 PASS | ✅ |
| P-g | typecheck 0 errors + msa-lint PASS | ✅ |
| P-h | 63 sprint streak + ServerKit MVP 전완점 | ✅ |
