---
code: FX-DESIGN-405
title: F671 ax-harness-kit gate-x Dogfood (Sprint 405)
status: Draft
sprint: 405
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 405 Design — F671 ax-harness-kit gate-x Dogfood

## §1 목표

ax-harness-kit Phase 1~3 (F666~F670) 실 BD 서비스 scaffold 검증. `init-monorepo gate-x` 1회 실행 → P-a~P-l 12항 Smoke Reality PASS.

## §2 즉시 Fix: `--with-claude-hooks` CLI wiring

**문제**: `generator.ts:withClaudeHooks` 옵션은 F670에서 구현됐지만 `init-monorepo.ts` CLI 커맨드에 `--with-claude-hooks` 플래그가 누락됨.

**Fix**: `packages/harness-kit/src/cli/init-monorepo.ts`에 1 option 추가 + `generateMonorepoScaffold` 호출에 `withClaudeHooks` 전달.

## §3 파일 매핑

### 수정 파일

| 파일 | 변경 | 이유 |
|------|------|------|
| `packages/harness-kit/src/cli/init-monorepo.ts` | `.option("--with-claude-hooks", ...)` 추가 + opts 전달 | F670 wiring 누락 fix |

### 생성 파일 (Dogfood 산출물)

| 파일 | 경로 | 내용 |
|------|------|------|
| reports/sprint-405-harness-dogfood-findings.md | 프로젝트 루트 | P-a~P-l 12항 판정 결과 |
| reports/sprint-405-drift-baseline.md | 프로젝트 루트 | Foundry-X rules ↔ gate-x drift 분석 |
| docs/metrics/velocity/sprint-405.json | 프로젝트 루트 | velocity 메트릭 |
| docs/04-report/features/sprint-405.report.md | 프로젝트 루트 | Sprint 보고서 |

### Dogfood 출력 디렉토리 (임시, 검증 후 폐기)

`/tmp/gate-x-dogfood-405/` — 실 scaffold 결과물

## §4 Dogfood 실행 순서

1. `cd packages/harness-kit && pnpm build` → dist/ 재생성
2. `pnpm test` → 84 tests PASS 확인
3. `node dist/cli/index.js init-monorepo gate-x ...` (6 옵션 포함) → scaffold 생성
4. P-c~P-k 검증 순서대로 실행
5. `diff -r .claude/rules /tmp/gate-x-dogfood-405/.claude/rules` → drift 분석
6. 결과 reports 2종 작성

## §5 TDD 계약

해당 없음 — Dogfood 검증 sprint, 새 서비스 로직 없음. TDD 면제.

단, harness-kit 기존 test suite (`pnpm test`) PASS 유지가 P-a 조건.

## §6 위험 대응

| 위험 | 대응 |
|------|------|
| `--with-claude-hooks` OPT_IN_DIR/claude-hooks 템플릿 누락 | ls OPT_IN_DIR 확인 후 실제 존재 여부 분기 |
| pnpm install peer warning | warnings 분류, 본질적 결함만 F-item 권고 |
| typecheck turbo cache (S337) | `pnpm exec tsc --noEmit` 직접 호출 |
| wrangler dry-run account_id 없음 | `--cf-account` 없이 실행, placeholder 기본값 사용 |
