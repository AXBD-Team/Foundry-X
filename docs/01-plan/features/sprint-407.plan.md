---
code: FX-PLAN-407
title: F673 ax-harness-kit improvements I-1+I-2+I-3 (Sprint 407)
status: Planned
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 407 — F673 ax-harness-kit improvements (I-1 D1 auto + I-2 SETUP.md + I-3 git init)

## §1 목적

S365 F671 gate-x Dogfood에서 권고된 improvement 3건(I-1 D1 auto create + I-2 SETUP.md auto-generate + I-3 git init 자동화)을 ax-harness-kit에 통합 → 신규 BD MSA 프로젝트 scaffold 후 **"5분 내 deploy-ready"** 도달.

## §2 배경 (S365 F671 Dogfood improvements)

| ID | 개선 | 현 상태 | 권고 |
|----|------|--------|------|
| I-1 | D1 database_id 자동 생성 | wrangler.toml.hbs에 `<RUN: wrangler d1 create ...>` placeholder 잔존 — 사용자가 수동 실행 + database_id 복붙 필요 | 옵션 A: `--with-d1-create` 플래그로 post-scaffold wrangler 실행 후 ID inject / 옵션 B: SETUP.md 가이드만 |
| I-2 | SETUP.md 자동 생성 | 템플릿 없음 (SPEC.md.hbs만 존재) | wrangler secret 등록 가이드 + D1 create + git init + first deploy step-by-step |
| I-3 | git init + initial commit | scaffold 후 사용자 수동 | 옵션 A: `--with-git-init` 플래그로 post-scaffold git init/add/commit 자동 / 옵션 B: SETUP.md 가이드만 |

## §3 사전 측정 (fs 실측, S283 패턴 32회차)

| 항목 | 값 |
|------|-----|
| 다음 F번호 | F673 |
| 다음 FX-REQ | FX-REQ-735 |
| 다음 Sprint | 407 |
| init-monorepo CLI 옵션 | 7종 (cf-account, worker-subdomain, output, with-bashrc-patch, with-tmux-patch, with-scripts, with-claude-hooks) |
| 신규 추가 플래그 | --with-d1-create, --d1-database-id, --with-git-init (총 10종) |
| SETUP.md 템플릿 | **부재** — 신규 생성 |
| wrangler.toml.hbs D1 placeholder | `<RUN: wrangler d1 create {{projectName}}-db ...>` |
| harness-kit baseline tests | 93 (F672 후) |

## §4 범위

### (a) I-1: D1 auto-create (옵션 A — CLI 자동 실행)

**플래그**: `--with-d1-create` (선택) + `--d1-database-id <id>` (선택, manual override)

**동작**:
1. scaffold 완료 후 (generator post-action 단계)
2. `--with-d1-create` 활성 + `--cf-account` 제공 시:
   - Node `execFile("npx", ["wrangler", "d1", "create", `${projectName}-db`, "--account-id", cfAccount], { cwd: outputDir })` 실행
   - stdout에서 `database_id = "..."` 추출 (line parsing)
   - `packages/api/wrangler.toml`의 placeholder 2곳 (`<RUN: ...>` + `<SAME_DATABASE_ID_AS_ABOVE>`)을 실 ID로 replace
3. 실패 시 (wrangler 미설치 / 인증 실패 / 네트워크) → console.warn + 수동 가이드 안내 + SETUP.md fallback section 활성
4. **`execFile` 사용 강제** (shell injection 방지, `exec` 금지)

**대체 옵션**: `--d1-database-id <id>` 플래그 단독 사용 시 wrangler 호출 없이 직접 inject (CI/non-interactive 환경 대응).

### (b) I-2: SETUP.md.hbs 신규 작성

신규 파일: `packages/harness-kit/src/scaffold/templates/monorepo/SETUP.md.hbs`

핵심 5개 섹션:
1. **의존성 설치** — `pnpm install`
2. **Cloudflare 자원 준비** — D1 create (또는 자동 생성 완료 표시) + wrangler secret 등록 가이드 (JWT_SECRET, GITHUB_TOKEN 등)
3. **Git 초기화** — git init (또는 자동 초기화 완료 표시) + `gh repo create` 가이드
4. **첫 배포** — D1 migrations apply + `pnpm build` + wrangler deploy + Pages deploy
5. **다음 단계** — `pnpm dev`, SPEC.md F-item 등록, `sprint N` 시동 안내

Handlebars 조건 분기 (`{{#if d1Created}}` / `{{#if gitInitialized}}`) 사용해서 자동 실행됐는지에 따라 가이드 본문 다르게 출력.

### (c) I-3: git init 자동화 (옵션 A — `--with-git-init`)

**플래그**: `--with-git-init`

**동작**:
1. scaffold 완료 후 outputDir에 `.git` 부재 확인 (이미 git repo 안이면 skip + warn)
2. `execFile("git", ["init"], { cwd: outputDir })` → `execFile("git", ["add", "."], { cwd: outputDir })` → `execFile("git", ["commit", "-m", "chore: initial scaffold (harness-kit)"], { cwd: outputDir })`
3. 실패 시 console.warn + 수동 가이드 안내
4. **`execFile` 사용 강제** (shell injection 방지)

### (d) generator 통합 + types 확장

`packages/harness-kit/src/types.ts`:
- `MonorepoScaffoldOptions`에 `withD1Create?: boolean`, `d1DatabaseId?: string`, `withGitInit?: boolean` 추가

`packages/harness-kit/src/scaffold/generator.ts`:
- `context`에 `d1Created`, `gitInitialized` boolean 추가 (SETUP.md.hbs `{{#if}}` 처리용)
- scaffold 후 post-action 함수 신규: `runD1Create()`, `runGitInit()` — 각각 `execFile` 기반
- Handlebars `if` helper 기본 동작 활용

`packages/harness-kit/src/cli/init-monorepo.ts`:
- `--with-d1-create`, `--d1-database-id <id>`, `--with-git-init` 3종 옵션 추가
- `generateMonorepoScaffold` 호출에 전달

### (e) 회귀 test 보강 (vitest, harness-kit)

신규 test T28~T32 (5건):
- T28: I-1 `--with-d1-create` + `--cf-account` 시 `execFile` mock 호출 + 인자 검증
- T29: I-1 `--d1-database-id <uuid>` 플래그 시 wrangler.toml에 ID inject 검증
- T30: I-2 SETUP.md.hbs 출력 + `{{#if d1Created}}` 분기 동작 확인 (양쪽 분기)
- T31: I-3 `--with-git-init` 시 `.git` 디렉토리 생성 + `execFile` mock 검증
- T32: scaffold 후 SETUP.md 파일이 출력 list에 포함

기존 93 + 5 신규 = **98 tests**.

### (f) Dogfood 재검증 (gate-x scaffold 3rd run)

```bash
rm -rf /tmp/gate-x-dogfood-407
node packages/harness-kit/dist/cli/index.js init-monorepo gate-x KTDS-AXBD gate-x \
  "Gate-X validation service" \
  --output /tmp/gate-x-dogfood-407 \
  --with-bashrc-patch --with-tmux-patch --with-scripts --with-claude-hooks \
  --d1-database-id "00000000-0000-0000-0000-000000000000" \
  --with-git-init \
  --cf-account b6c06059b413892a92f150e5ca496236
```

> ⚠️ `--with-d1-create` 실 호출은 CF 인증 의존 — Dogfood scope에서는 `--d1-database-id` placeholder 사용 (코드 경로 작동 확인 목적). 실 wrangler 호출은 unit test에서 mock으로 검증.

**검증**:
- `ls /tmp/gate-x-dogfood-407/SETUP.md` (I-2 ✅)
- `ls /tmp/gate-x-dogfood-407/.git` (I-3 ✅)
- `grep -c "<RUN:" /tmp/gate-x-dogfood-407/packages/api/wrangler.toml` = 0 (I-1 inject 성공)
- `cd /tmp/gate-x-dogfood-407 && git log --oneline -1` (initial commit 존재)

### (g) reports 생성

`reports/sprint-407-dogfood-3rd-run.md`:
- 3rd Dogfood 결과 + 10 플래그 모두 활성 시 동작 확증
- I-1/I-2/I-3 각 PASS/PARTIAL/FAIL 판정
- 남은 improvement (I-4/I-5) 권고 명시

## §5 Phase Exit — Smoke Reality (P-a~P-j 10항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | I-1 `--with-d1-create` + `--d1-database-id` 플래그 추가 | `grep -E "with-d1-create\|d1-database-id" init-monorepo.ts` ≥ 2 |
| P-b | I-1 `execFile`(shell 안전) 사용 + `exec` 사용 0건 | `grep -c "execFile" generator.ts` ≥ 1 + `grep -c '^import.*exec\b' generator.ts` = 0 |
| P-c | I-2 SETUP.md.hbs 핵심 5 섹션 (`^## `) ≥ 5 | grep |
| P-d | I-3 `--with-git-init` 플래그 추가 + `execFile` git init/add/commit 3 호출 | grep |
| P-e | harness-kit vitest 98/98 PASS (93 + 5 신규 T28~T32) | `pnpm -F @foundry-x/harness-kit test` |
| P-f | gate-x 3rd-run SETUP.md 생성 + .git/ 디렉토리 + initial commit 1건 | `ls /tmp/gate-x-dogfood-407/{SETUP.md,.git}` + `git log --oneline -1` |
| P-g | gate-x 3rd-run wrangler.toml에 `<RUN:` placeholder 0 (I-1 inject 성공) | grep |
| P-h | scaffold file count 51→52+ (SETUP.md +1) | autopilot 판단 |
| P-i | reports/sprint-407-dogfood-3rd-run.md 신규 생성 | `ls reports/sprint-407-*.md` ≥ 1 |
| P-j | dual_ai_reviews D1 INSERT sprint 407 ≥ 1건 | manual check |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| `wrangler d1 create` 실 호출이 CF 인증 의존 → CI/Dogfood mock 어려움 | (1) `execFile` mock으로 단위 test / (2) Dogfood는 `--d1-database-id` placeholder 사용 / (3) `--with-d1-create` 실패 시 console.warn + 수동 가이드 fallback |
| `git init` 자동화가 outputDir 외부 영향 (예: 이미 git repo 안) | scaffold가 outputDir 새로 만든 경우만 git init (`.git` 부재 확인 후 실행) |
| SETUP.md.hbs `{{#if}}` 조건 처리 — Handlebars 기본 미설정 시 빈 출력 | context에 d1Created/gitInitialized boolean 명시 추가 + Handlebars 기본 if helper 사용 |
| harness-kit 기존 93 test 회귀 | `pnpm test --force` 전체 실행 + 0 regressions 확증 (S337 cache 우회 룰) |
| **shell injection** — projectName 등 사용자 입력이 shell escape 누락 시 | **`execFile` 강제** (별도 args 배열), `exec` 금지 (보안 hook 발견 학습) |

## §7 Out-of-scope

- ❌ I-4 `.nvmrc` 정합성 CI 게이트 (별 F-item)
- ❌ I-5 harness drift check script (별 F-item)
- ❌ `gh repo create` 자동 호출 (인증 의존, SETUP.md 가이드만)
- ❌ ax-harness-kit npm publish (별 트랙)

## §8 S360 hallucination 회피 강제 (학습 7회차)

- ✅ reports/sprint-407-dogfood-3rd-run.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-407.json **f_items=F673 정확** + autopilot stale "F672" 답습 차단 (8회차 차단 시도)
- ✅ design + report 둘 다 자동 생성
- ✅ Phase Exit P-i "reports/sprint-407-*.md ≥ 1 신규" 강제 검증

## §9 예상 시간

~50~70분 autopilot (3 improvements 통합 + 5 신규 회귀 test + 3rd Dogfood 재검증).

## §10 관련 문서

- S365 F671 findings: `reports/sprint-405-harness-dogfood-findings.md` (개선 후보 섹션)
- S366 F672 fix: `reports/sprint-406-dogfood-rerun.md`
- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- harness-kit README: `packages/harness-kit/README.md`
