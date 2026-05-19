---
code: FX-DESIGN-407
title: F673 ax-harness-kit improvements I-1+I-2+I-3
status: Draft
sprint: 407
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 407 Design — F673 ax-harness-kit improvements (I-1 D1 auto + I-2 SETUP.md + I-3 git init)

## §1 목적

ax-harness-kit에 scaffold 후 "5분 내 deploy-ready" 도달을 위한 3가지 improvement 통합.

## §2 변경 파일 매핑

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `packages/harness-kit/src/types.ts` | 수정 | `MonorepoScaffoldOptions`에 `withD1Create`, `d1DatabaseId`, `withGitInit` 추가 |
| `packages/harness-kit/src/scaffold/generator.ts` | 수정 | context 확장, `runD1Create()`, `runGitInit()` post-action 추가 |
| `packages/harness-kit/src/cli/init-monorepo.ts` | 수정 | 3종 CLI 옵션 추가 |
| `packages/harness-kit/src/scaffold/templates/monorepo/SETUP.md.hbs` | 신규 | 5섹션 SETUP 가이드 |
| `packages/harness-kit/__tests__/scaffold/monorepo.test.ts` | 수정 | T28(F673)~T32(F673) 5 신규 테스트 |

## §3 타입 확장 — MonorepoScaffoldOptions

추가 3 필드:
- `withD1Create?: boolean` — I-1: wrangler d1 create 자동 실행
- `d1DatabaseId?: string` — I-1: 수동 ID 주입 (wrangler 호출 없이)
- `withGitInit?: boolean` — I-3: git init + initial commit 자동

## §4 generator.ts 확장 설계

### context 확장

기존 context에 두 boolean 추가 (SETUP.md.hbs `{{#if}}` 처리용):
- `d1Created: boolean` — D1 자동 생성 성공 여부
- `gitInitialized: boolean` — git init 성공 여부

### post-action 실행 순서

1. `walkTemplates()` — 전체 파일 생성 (SETUP.md 포함, 기본 context로 렌더링)
2. `injectD1Id()` — `d1DatabaseId` 옵션 있으면 wrangler.toml placeholder 교체
3. `runD1Create()` — `withD1Create` + `cloudflareAccount` 있으면 wrangler CLI 실행 후 inject
4. `rewriteSetupMd()` — d1Created/gitInitialized 결정 후 SETUP.md 재렌더링 (조건 분기 반영)
5. `runGitInit()` — `withGitInit` 있으면 git 초기화

### 보안 원칙 (Plan §6)

Node.js `child_process.execFile` + `util.promisify` 사용:
- 별도 `args` 배열로 사용자 입력 전달 (shell injection 방지)
- shell 모드 비활성화 (기본값)
- 실패 시 `console.warn()` + 수동 가이드 fallback (process.exit 없음)

### D1 ID inject 로직

`packages/api/wrangler.toml`의 두 가지 placeholder 교체:
- `<RUN: wrangler d1 create ...>` → 실 ID
- `<SAME_DATABASE_ID_AS_ABOVE>` → 동일 실 ID

ID 추출 (wrangler 실행 시): stdout에서 `database_id = "..."` 패턴 파싱

## §5 SETUP.md.hbs 구조

위치: `packages/harness-kit/src/scaffold/templates/monorepo/SETUP.md.hbs`

5개 섹션 (`## N.` 형식):
1. **의존성 설치** — `pnpm install`
2. **Cloudflare 자원 준비** — `{{#if d1Created}}` 완료 표시 / else wrangler 가이드
3. **Git 초기화** — `{{#if gitInitialized}}` 완료 표시 / else 수동 가이드
4. **첫 배포** — D1 migrations apply + build + wrangler deploy
5. **다음 단계** — pnpm dev, SPEC.md F-item, sprint N 시동

## §6 CLI 옵션 추가 — init-monorepo.ts

3 신규 Commander 옵션:
- `--with-d1-create` (boolean flag)
- `--d1-database-id <id>` (string)
- `--with-git-init` (boolean flag)

action 핸들러에서 `generateMonorepoScaffold` 호출 시 전달.

## §7 테스트 계약 (TDD Red Target)

| Test | 설명 | 핵심 assertion |
|------|------|----------------|
| T28(F673) | `--d1-database-id` 시 wrangler.toml의 `<RUN:` placeholder 0건 | `grep '<RUN:'` = 0건 |
| T29(F673) | `--d1-database-id` ID 값이 wrangler.toml 3곳에 inject | `grep 'test-db-id' count` ≥ 3 |
| T30(F673) | SETUP.md 생성 + 미설정 시 wrangler 수동 안내 텍스트 포함 | `SETUP.md` 존재 + 내용 확인 |
| T31(F673) | `--with-git-init` 시 `.git` 디렉토리 생성 | `.git` 존재 |
| T32(F673) | scaffold 반환 file list에 SETUP.md 포함 | `files.some(f => f.endsWith('SETUP.md'))` |

기존 93 + 신규 5 = **98 tests**

## §8 Phase Exit P-a~P-j (Plan §5)

| # | PASS 기준 |
|---|-----------|
| P-a | `--with-d1-create`, `--d1-database-id` 플래그 init-monorepo.ts에 존재 |
| P-b | `promisify(execFile)` 사용 ≥1 (shell-safe) |
| P-c | SETUP.md.hbs 섹션 `^## ` ≥ 5 |
| P-d | `--with-git-init` 플래그 + git 3단계 호출 |
| P-e | harness-kit vitest 98/98 PASS |
| P-f | gate-x 3rd-run SETUP.md + .git/ + initial commit |
| P-g | wrangler.toml `<RUN:` = 0 |
| P-h | scaffold file count 52+ |
| P-i | reports/sprint-407-dogfood-3rd-run.md 신규 |
| P-j | dual_ai_reviews D1 INSERT ≥1 |
