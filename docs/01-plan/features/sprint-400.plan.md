# Sprint 400 Plan — F666 ax-harness-kit Tier 1

**Sprint**: 400 | **F-item**: F666 | **REQ**: FX-REQ-728 | **Date**: 2026-05-19

---

## 1. Context

F666: ax-harness-kit Tier 1 — init-harness 스킬 + 3단계 스크립트 + 변수 치환 + 4-package 골격
PRD: `docs/specs/ax-harness-kit/prd-final.md` (Ambiguity 0.155, R2 조건 4 반영)

**목표**: `/ax:init-harness <project-name>` 한 번으로 신규 프로젝트가 Foundry-X 동등 인프라 ≤5분 가동.

---

## 2. 스코프

### In-Scope (F666 = M1~M4)

| 항목 | 범위 |
|------|------|
| (a) ax-marketplace `init-harness` 스킬 | SKILL.md 진입점, 5 파라미터 |
| (b) 3단계 스크립트 | preflight.sh + install.sh + verify.sh (idempotent, .bak.{timestamp}) |
| (c) 변수 치환 시스템 | PROJECT_NAME / GITHUB_ORG / GITHUB_REPO / PROJECT_DESCRIPTION / CLOUDFLARE_ACCOUNT / WORKER_SUBDOMAIN |
| (d) 4-package 골격 | api / web / cli / shared + package.json + turbo.json + .nvmrc 22 + .gitignore |

### Out-of-Scope (LOCKED)

- M5 Cloudflare 배포 인프라 (wrangler.toml + deploy.yml + d1-migrate-remote.sh) → **F667**
- .claude/rules/ 9 파일 변수화 + SPEC.md 템플릿 → **F668**
- bashrc + tmux + scripts/task 옵트인 → **F669**
- claude hooks 4종 → **F670**
- Dogfood 실 배포 + smoke 4-축 → **F667**

---

## 3. 기존 Baseline (fs 실측)

```
packages/harness-kit/
  src/scaffold/generator.ts     ← Handlebars 기반 단일 Workers service scaffold
  src/types.ts                  ← ScaffoldOptions (단일 서비스 전용)
  src/scaffold/templates/       ← 단일 서비스 7개 hbs 파일
  __tests__/scaffold/generator.test.ts ← 61 tests ALL PASS
```

ax-marketplace:
- `init-harness` 스킬 **미존재** (신규)
- 기존 24개 스킬 (`~/.claude/plugins/marketplaces/ax-marketplace/skills/`)

---

## 4. 구현 파일 매핑 (F666 전체)

### packages/harness-kit (TypeScript)

| 파일 | 작업 | TDD |
|------|------|-----|
| `src/types.ts` | `MonorepoScaffoldOptions` 타입 추가 (6 vars) | - |
| `src/scaffold/generator.ts` | `generateMonorepoScaffold()` 신규 함수 | Green |
| `src/scaffold/templates/monorepo/` | 신규 템플릿 디렉토리 (4-package) | Red 인프라 |
| `src/cli/index.ts` | `init-monorepo` 서브커맨드 추가 | - |
| `__tests__/scaffold/monorepo.test.ts` | TDD T1~T6 (Red → Green) | Red |

### ax-marketplace plugin

| 파일 | 작업 |
|------|------|
| `skills/init-harness/SKILL.md` | 신규 스킬 (5 파라미터, 3-step flow) |
| `skills/init-harness/scripts/preflight.sh` | 환경 8항 사전 점검 (idempotent) |
| `skills/init-harness/scripts/install.sh` | Tier 1 설치 (변수 치환 + 4-package 골격) |
| `skills/init-harness/scripts/verify.sh` | grep 0건 + idempotency diff 0건 |

---

## 5. TDD Red Targets (T1~T6)

```typescript
// __tests__/scaffold/monorepo.test.ts
describe("Monorepo Scaffold Generator", () => {
  T1: "should create 4-package directory structure (api/web/cli/shared)"
  T2: "should substitute PROJECT_NAME in root package.json"
  T3: "should substitute GITHUB_ORG in package @scope"
  T4: "should substitute CLOUDFLARE_ACCOUNT in wrangler.toml"
  T5: "should be idempotent — 2nd run produces no diff"
  T6: "should contain no Foundry-X or ktds-axbd identifiers in output"
})
```

---

## 6. 4-package 골격 상세

### 생성 파일 목록

```
{PROJECT_NAME}/
  package.json          ← pnpm workspace (api/web/cli/shared)
  pnpm-workspace.yaml
  turbo.json
  .nvmrc                ← "22"
  .gitignore
  tsconfig.base.json
  packages/
    api/
      package.json      ← @{GITHUB_ORG}/{PROJECT_NAME}-api
      tsconfig.json
      wrangler.toml     ← name={PROJECT_NAME}-api, account_id={CLOUDFLARE_ACCOUNT}
      src/index.ts
      src/app.ts
    web/
      package.json      ← @{GITHUB_ORG}/{PROJECT_NAME}-web
      tsconfig.json
      vite.config.ts
      index.html
      src/main.tsx
    cli/
      package.json      ← @{GITHUB_ORG}/{PROJECT_NAME}-cli
      tsconfig.json
      src/index.ts
    shared/
      package.json      ← @{GITHUB_ORG}/{PROJECT_NAME}-shared
      tsconfig.json
      src/index.ts
```

---

## 7. 변수 치환 6 Variables

| 변수 | CLI 파라미터 | 예시 |
|------|------------|------|
| `PROJECT_NAME` | `<project-name>` | `proposal-tf-platform` |
| `GITHUB_ORG` | `<github-org>` | `KTDS-AXBD` |
| `GITHUB_REPO` | `<github-repo>` | `proposal-tf-platform` |
| `PROJECT_DESCRIPTION` | `"<description>"` | `"제안TF 지원 플랫폼"` |
| `CLOUDFLARE_ACCOUNT` | `--cf-account` | `abc123def456` |
| `WORKER_SUBDOMAIN` | `--worker-subdomain` | `proposal-tf-platform` |

---

## 8. Phase Exit Smoke Reality (P-a~P-h)

| # | 항목 | 검증 방법 |
|---|------|----------|
| P-a | preflight 8항 PASS | preflight.sh 출력 (git/pnpm/wrangler/gh/bash/Node22/CF auth/GH auth) |
| P-b | 변수 치환 후 grep ktds-axbd 0건 | verify.sh grep 결과 |
| P-c | idempotency 2회 실행 diff 0건 | verify.sh 2차 diff |
| P-d | 4-package pnpm install + turbo build PASS | 로컬 scaffold 생성 후 pnpm install |
| P-e | typecheck PASS | `pnpm exec tsc --noEmit` --force (S337 turbo 우회) |
| P-f | msa-lint PASS | S360 hallucination 회피 학습 적용 |
| P-g | report.md + velocity 모두 생성 | S362 velocity stale 5회차 차단 강화 |
| P-h | dual_ai_reviews + 64 sprint streak | D1 INSERT 확인 |

---

## 9. TDD 적용 등급

| 대상 | 등급 | 이유 |
|------|------|------|
| `generateMonorepoScaffold()` | **필수** (새 서비스 로직) | TypeScript 함수, 단위 테스트 가능 |
| ax-marketplace SKILL.md | **면제** (meta) | Claude Code 스킬 문서 |
| bash 스크립트 | **선택** | 환경 의존성 높음, bats 테스트 별 sprint |
| 템플릿 hbs 파일 | **면제** (meta) | 내용 자체가 테스트 대상 아님 |
