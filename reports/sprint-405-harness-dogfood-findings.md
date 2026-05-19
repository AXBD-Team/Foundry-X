# Sprint 405 — ax-harness-kit gate-x Dogfood Findings

**Date**: 2026-05-19  
**Sprint**: 405 | **F-item**: F671 | **Author**: Sinclair Seo (autopilot)  
**Target**: `/tmp/gate-x-dogfood-405` (생성 후 폐기)

---

## Phase 1~3 판정 요약

| Phase | 항목 | 판정 | 비고 |
|-------|------|------|------|
| Phase 1 (Tier 1) | 4-package 골격 생성 | ✅ PASS | 51 files, 핵심 15/15 |
| Phase 2 Tier 2-A | rules 변수화 | ✅ PASS | gate-x 치환 100%, Foundry-X 잔존 0 |
| Phase 2 Tier 2-B | opt-in 3 플래그 | ✅ PASS | bashrc/tmux/scripts 모두 존재 |
| Phase 3 | .claude/settings.json hooks | ✅ PASS | 4 hooks, Foundry-X 흔적 0 |

---

## P-a~P-l 12항 Smoke Reality

| # | 항목 | 결과 | 세부 |
|---|------|------|------|
| P-a | harness-kit build + test | ✅ PASS | 89/89 tests PASS (baseline 84 → 89 +5) |
| P-b | init-monorepo 정상 종료 | ✅ PASS | exit 0, "Created 51 files" |
| P-c | 출력 파일 ≥ 25개 | ✅ PASS | 51 files |
| P-d | placeholder 잔존 0건 | ✅ PASS | grep 0건 |
| P-e | Foundry-X 잔존 0건 (제외 후) | ✅ PASS | rules 내 Foundry-X 0건 |
| P-f | pnpm install 성공 | ⚠️ PARTIAL | `--ignore-scripts` 필요 (esbuild 버전 충돌) |
| P-g | pnpm typecheck PASS | ✅ PASS | 4/4 packages, turbo --force 실행 |
| P-h | pnpm lint 0 errors | ⚠️ PARTIAL | eslint devDependency 누락 (cli, web) |
| P-i | pnpm test 0 fails | ⚠️ PARTIAL | api test 0 files (web/cli/shared PASS) |
| P-j | pnpm build 성공 | ✅ PASS | vite web dist 143.70 KiB |
| P-k | wrangler deploy --dry-run PASS | ✅ PASS | 84.62 KiB / 20.16 KiB gzip |
| P-l | reports ≥ 2 신규 생성 | ✅ PASS | findings + drift-baseline |

**Phase 1~3 PASS. PARTIAL 3건 → F672 결함 등록 권고.**

---

## 즉시 Fix (본 sprint 완료)

### Fix-1: `--with-claude-hooks` CLI 플래그 누락

- **파일**: `packages/harness-kit/src/cli/init-monorepo.ts`
- **변경**: `.option("--with-claude-hooks", "P3: .claude/settings.json hooks 4종 opt-in ...")` 추가 + `generateMonorepoScaffold` 호출에 `withClaudeHooks: opts.withClaudeHooks` 전달
- **검증**: `--with-claude-hooks` 포함 실행 시 `.claude/settings.json` + 4 hook scripts 생성 ✅

---

## 결함 목록 → F672 권고

### D-1: esbuild 버전 충돌 (pnpm install --ignore-scripts 필요)

- **증상**: vite@6 (`esbuild@0.25.x`) + wrangler@4 (`esbuild@0.28.x`) 공존 시, Node 22+ 환경에서 postinstall 충돌
- **현상**: `esbuild@0.28.0 postinstall: Error: Expected "0.28.0" but got "0.25.12"`
- **회피**: `pnpm install --ignore-scripts` (완전한 해결 아님)
- **권고**: wrangler를 root devDependency로 이동하거나, vite/wrangler 버전 pin + `overrides` 설정

### D-2: eslint devDependency 누락

- **증상**: `cli`, `web` 패키지 `package.json`에 eslint devDependency 없음 → `eslint: not found`
- **템플릿 파일**: `packages/harness-kit/src/scaffold/templates/monorepo/packages/{cli,web}/package.json.hbs`
- **권고**: eslint + @typescript-eslint/eslint-plugin + @typescript-eslint/parser 추가

### D-3: api 패키지 test 파일 없음

- **증상**: `packages/api` vitest "No test files found" → exit 1
- **권고**: 최소 1개 smoke test (`app.request()` 기반) 템플릿 추가

---

## 개선 후보 (장기)

| 번호 | 개선 내용 | 우선순위 |
|------|----------|---------|
| I-1 | D1 database_id 자동 생성 (`wrangler d1 create` 자동 실행) | P1 |
| I-2 | wrangler secret 초기 등록 가이드 자동 생성 (SETUP.md) | P1 |
| I-3 | git init + initial commit 자동화 | P2 |
| I-4 | `.nvmrc` Node 버전과 템플릿 dependency 정합성 CI 게이트 | P2 |
| I-5 | harness drift check script (`check-harness-drift.sh`) 실행 검증 | P3 |

---

## 차기 F-item 권고

| F번호 | 제목 | 범위 | 우선순위 |
|-------|------|------|---------|
| F672 | ax-harness-kit 템플릿 결함 3종 fix (D-1/D-2/D-3) | harness-kit templates | P0 |
| F673 | ax-harness-kit 개선 I-1~I-2 (D1 auto + SETUP.md) | harness-kit scaffold | P1 |
