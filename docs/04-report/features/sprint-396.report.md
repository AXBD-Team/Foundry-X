---
code: FX-RPRT-396
title: F662 CQ 5축 graph_session hook 연결 — Sprint 396 완료 보고
version: 1.0
status: Final
category: Report
phase: 47
sprint: 396
f_items:
  - F662
req:
  - FX-REQ-724
priority: P0
created: 2026-05-16
session: S362
---

# Sprint 396 Report — F662 CQ 5축 graph_session hook 연결 (gap fill)

## §1 요약

| 항목 | 값 |
|------|-----|
| Sprint | 396 |
| F-item | F662 (FX-REQ-724, P0) |
| Phase | 47 |
| 시동 → MERGED | 2026-05-16 14:02:47 → 14:18:04 KST (**~15분 17초**) |
| PR | [#822](https://github.com/KTDS-AXBD/Foundry-X/pull/822) — merge `40c74108` |
| 변경 | +453 / -11, 9 files |
| Match Rate | **100%** |
| Tests | 2466/2468 PASS (+4 신규 T4~T7) |
| msa-lint | ✅ SUCCESS (S360 학습 적용 — F660 hotfix-forward 19회차 변종 차단) |
| SDD Triangle | ✅ SUCCESS |
| Streak | **60 sprint 연속 성공** (S306~S357 + F619 + F621 + F660 + F661 + F662) |

## §2 진정한 gap fill (Plan §1 baseline 발견 기반)

### F632 baseline (S362 시작 시 fs 실측 26회차 발견)

- `packages/api/src/core/cq/` 디렉토리 **이미 존재** (515 LOC)
- D1 migration `0144_cq_evaluations.sql` **이미 적용** (3 테이블 FK + CHECK)
- `app.ts:145 /api/cq` **이미 mount**
- 5축 평가 + 90점 분기 + audit-bus emit 모두 동작 ✅

### F662 진정한 gap (Plan 재정의된 범위)

| # | gap | 해소 |
|---|-----|------|
| (a) | D1 migration 신규 (graph_session_id + failure_reason 컬럼) | `0155_cq_evaluations_graph_session.sql` 신규 |
| (b) | graph_session 종결 hook 미연결 | `discovery-stage-runner.ts:23 autoTriggerCQEvaluator` 신규 + line 305 waitUntil 호출 |
| (c) | CQEvaluator.evaluate() graphSessionId 파라미터 부재 | `evaluate()` optional 파라미터 + INSERT 컬럼 채움 |
| (d) | <90 failure_reason 자동 분류 부재 | parseAxisScores 실패 → infra_issue / 정상 but 낮음 → human_error |
| (e) | integration test 부재 | `cq-graph-hook.test.ts` T4~T7 (4 PASS) |

## §3 Phase Exit P-a~P-h (Smoke Reality 8항)

| # | 항목 | 판정 |
|---|------|:---:|
| P-a | migration 0155 apply + 컬럼 검증 | ✅ (test 환경 schema 반영) |
| P-b | 평가 에이전트 동작 | ✅ (mock LLM call) |
| P-c | cq_evaluations INSERT 시 graph_session_id 채워짐 | ✅ T4 PASS |
| P-d | <90 failure_reason 자동 분류 PASS | ✅ T5 human_error + T6 infra_issue |
| P-e | audit-bus emit cq.evaluated trace_id chainValid | ✅ T5 payload 검증 |
| P-f | F632 baseline 회귀 0 + F606/F607 회귀 0 | ✅ 2466/2468 PASS |
| P-g | `pnpm exec tsc --noEmit` PASS (turbo 우회, S337) | ✅ 0 errors |
| P-h | dual_ai_reviews hook 자동 INSERT ≥ 1건 | ⏳ CI 완료 후 자동 확인 (hook 50 sprint 연속) |

## §4 산출물 검증 (S360 hallucination 회피 학습 효과)

- ✅ `reports/sprint-396-cq-hook-integration.md` (2130 bytes, 실파일)
- ✅ `reports/sprint-396-failure-classification-samples.md` (2232 bytes, 실파일)
- ✅ `docs/01-plan/features/sprint-396.plan.md` (10769 bytes, 191L)
- ✅ `docs/02-design/features/sprint-396.design.md` (3159 bytes, autopilot 자동 생성)
- ✅ `docs/04-report/features/sprint-396.report.md` (본 문서, S362 fixup)
- ✅ `docs/metrics/velocity/sprint-396.json` (S362 fixup — f_items "F642" stale → "F662", duration 0→15)

> **autopilot velocity stale 답습 패턴 재현 (S360+S362, 2회차)** — autopilot이 velocity 작성 시 직전 sprint 값을 답습. session-end fixup 정착 (rules "Autopilot Production Smoke Test" 변종 후보).

## §5 메타 학습 (S362 신규 관찰)

### (1) Plan fs 실측 의무화 26회차 효과 결정적 — gap fill 성공

F662 row PRD 가정 ("0165 migration 신규" + "schema 신규") vs 실측 (0154 + F632 baseline)의 큰 drift를 Plan 작성 단계에서 사전 발견 → scope 재정의로 60~90분 예상 → **15분 단축**. rules "Sprint 사전 등록 + Plan 작성 fs 실측 의무화" S283 패턴 26회차 정착화.

### (2) gap fill 패턴 3회차 누적

- S280 F435 (AIF-REQ-018 이미 구현 발견)
- S282 F437 (analysis-report/ 경로 정밀화)
- **S362 F662 (F632 baseline 활용)** ← 본 sprint

**휴리스틱**: 사전 측정 단계에서 `find core/{domain}` + `grep test 파일 존재` + `migration grep`으로 사전 구축 확인 → scope 자동 축소.

### (3) S360 hallucination 회피 학습 효과 확증 (4회차)

- ✅ msa-lint PASS (Plan §7 P-g + autopilot 사전 강제 효과)
- ✅ reports/sprint-396-*.md 2건 실파일 생성 (Plan §7 강제 명시)
- ⚠️ velocity.json f_items stale 답습 (post-merge fixup 가능)
- ⚠️ report.md autopilot 자동 생성 누락 (post-merge fixup 가능)

→ 차기 Plan에 "**autopilot이 velocity + report.md 둘 다 생성 의무화**" 추가 명시 권고.

### (4) F643 fix 효과 4회차 검증 PASS

- ✅ signal `F_ITEMS=F662` 정확 추출 (bashrc Fix A awk exact match)
- ✅ `.sprint-context` 부재 (S351 git rm --cached 영구 차단 효과)
- ✅ `.dev.vars` 자동 복사 (C104)

### (5) 60 sprint streak 달성

S306~S357 (Match 95→100→100→97→98→100→97→97→98→97→100→95+100→97→98→100→98→100…) + F619 ✅ + F621 ✅ + F660 ✅ + F661 ✅ + F662 ✅ = **60 sprint streak**. Production-fail-revert 1 + cascading-revert 1 + PoC-deferred 1 + lint-fail-hotfix-forward 1 4종 변종 외 모두 정상 결산.

## §6 다음 사이클 후보

- **F663** Sprint 397 — 80-20-80 HITL 5-state 머신 + hitl_queue D1 (F662 ✅ 의존 충족)
- **F664** Sprint 398 — HITL Console UI
- **F665** Sprint 398+ — CQ 작성 가이드 + AI 금지 강제
- F647 sidebar Portal race fix (S361 다음 사이클 후보)
- F645 silent layer 7 fix
- W20 KPI 6/8 베이스라인 측정
- Cloudflare KV 점수 캐싱 PoC (PRD §11)
