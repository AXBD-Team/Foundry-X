# Sprint 400 Design — F666 ax-harness-kit Tier 1

**Sprint**: 400 | **F-item**: F666 | **Date**: 2026-05-19

---

## 1. 아키텍처 개요

```
ax-marketplace plugin
  skills/init-harness/
    SKILL.md              ← Claude Code 진입점 (사용자 /ax:init-harness 호출)
    scripts/
      preflight.sh        ← 환경 8항 사전 점검
      install.sh          ← Tier 1 설치 (harness CLI 호출)
      verify.sh           ← 변수 잔존 검증 + idempotency

Foundry-X repo
  packages/harness-kit/
    src/
      types.ts            ← MonorepoScaffoldOptions (6 variables)
      scaffold/
        generator.ts      ← generateMonorepoScaffold() 신규
        templates/
          monorepo/       ← 4-package Handlebars 템플릿
    __tests__/scaffold/
      monorepo.test.ts    ← TDD T1~T6
```

**호출 흐름**:
```
사용자: /ax:init-harness proposal-tf-platform KTDS-AXBD/proposal-tf-platform "제안TF 지원 플랫폼"
  → init-harness SKILL.md 읽기
  → preflight.sh 실행 (환경 점검)
  → install.sh 실행 (harness init-monorepo CLI 호출)
    → generateMonorepoScaffold() → 4-package 파일 생성
  → verify.sh 실행 (grep + diff)
```

---

## 2. 타입 설계

### MonorepoScaffoldOptions (src/types.ts 추가)

```typescript
export interface MonorepoScaffoldOptions {
  projectName: string;       // kebab-case, 예: "proposal-tf-platform"
  githubOrg: string;         // 예: "KTDS-AXBD"
  githubRepo: string;        // 예: "proposal-tf-platform"
  description: string;       // 예: "제안TF 지원 플랫폼"
  cloudflareAccount?: string; // 예: "abc123def456"
  workerSubdomain?: string;  // 예: "proposal-tf-platform"
  outputDir?: string;        // default: process.cwd()/{projectName}
}
```

---

## 3. generateMonorepoScaffold() 설계

```typescript
// packages/harness-kit/src/scaffold/generator.ts 추가

export async function generateMonorepoScaffold(
  options: MonorepoScaffoldOptions
): Promise<string[]>
```

**처리 흐름**:
1. `outputDir` 결정 (options.outputDir ?? cwd/projectName)
2. Handlebars context 구성 (6 variables)
3. `MONOREPO_TEMPLATES_DIR` (templates/monorepo/) walkTemplates() 실행
4. 생성 파일 목록 반환

**멱등성**: 기존 파일 있으면 덮어쓰기 (fs.writeFileSync overwrite)
→ verify.sh가 2차 diff 0건으로 확인

---

## 4. 4-package 템플릿 파일 목록

### Root 레벨

| 파일 | 변수 | 설명 |
|------|------|------|
| `package.json.hbs` | projectName | pnpm workspace 루트 |
| `pnpm-workspace.yaml` | - | `packages: ["packages/*"]` |
| `turbo.json.hbs` | projectName | build/test/lint/typecheck tasks |
| `.nvmrc` | - | `22` 고정 |
| `.gitignore` | - | Node.js 표준 + .dev.vars + dist |
| `tsconfig.base.json` | - | strict mode 공통 base |

### packages/api

| 파일 | 변수 | 설명 |
|------|------|------|
| `package.json.hbs` | projectName, githubOrg | `@{githubOrg}/{projectName}-api` |
| `tsconfig.json` | - | extends ../../tsconfig.base.json |
| `wrangler.toml.hbs` | projectName, cloudflareAccount, workerSubdomain | Hono Workers |
| `src/index.ts.hbs` | - | Hono entry point |
| `src/app.ts.hbs` | projectName | OpenAPIHono setup |

### packages/web

| 파일 | 변수 | 설명 |
|------|------|------|
| `package.json.hbs` | projectName, githubOrg | `@{githubOrg}/{projectName}-web` |
| `tsconfig.json` | - | React + DOM |
| `vite.config.ts.hbs` | - | Vite 8 설정 |
| `index.html.hbs` | projectName, description | SPA entry |
| `src/main.tsx.hbs` | - | React 18 mount |

### packages/cli

| 파일 | 변수 | 설명 |
|------|------|------|
| `package.json.hbs` | projectName, githubOrg | `@{githubOrg}/{projectName}-cli` |
| `tsconfig.json` | - | Node 22 + ESM |
| `src/index.ts.hbs` | projectName | Commander 진입점 |

### packages/shared

| 파일 | 변수 | 설명 |
|------|------|------|
| `package.json.hbs` | projectName, githubOrg | `@{githubOrg}/{projectName}-shared` |
| `tsconfig.json` | - | declaration: true |
| `src/index.ts` | - | `export {}` 빈 시작점 |

---

## 5. TDD Red 계약 (T1~T6)

```typescript
// __tests__/scaffold/monorepo.test.ts

describe("generateMonorepoScaffold", () => {
  T1: 4-package 디렉토리 구조 생성
    - packages/api, packages/web, packages/cli, packages/shared 존재
    - root package.json, turbo.json, .nvmrc, .gitignore 존재

  T2: PROJECT_NAME 변수 치환
    - root/package.json에 "proposal-tf-platform" 포함
    - packages/api/wrangler.toml에 name = "proposal-tf-platform-api"

  T3: GITHUB_ORG 변수 치환
    - packages/api/package.json에 "@KTDS-AXBD/proposal-tf-platform-api"

  T4: CLOUDFLARE_ACCOUNT 변수 치환
    - packages/api/wrangler.toml에 account_id = "abc123"

  T5: 멱등성 — 2회 실행 동일 결과
    - 1차 생성 후 파일 내용 읽기
    - 2차 실행 후 동일 내용
    - diff = 0

  T6: Foundry-X 식별자 0건
    - "foundry-x", "ktds-axbd", "Foundry-X" grep 0건
    (단, package.json의 하네스킷 의존성 제외)
})
```

---

## 6. bash 스크립트 설계

### preflight.sh

```bash
# 점검 항목 (8개)
1. git --version
2. pnpm --version
3. wrangler --version (선택 — 없으면 warn만)
4. gh --version
5. bash --version
6. node --version (22.x 확인)
7. wrangler whoami (CF 인증, 선택)
8. gh auth status (GH 인증, 선택)

# 출력: ✅ / ❌ 각 항목
# 필수 실패 시: exit 1 + 가이드 메시지
# 선택 실패 시: ⚠️ warn + 계속
```

### install.sh

```bash
# 파라미터: PROJECT_NAME GITHUB_ORG GITHUB_REPO DESCRIPTION [--cf-account ACCOUNT] [--worker-subdomain SUBDOMAIN]
# 1. 타겟 디렉토리 확인 + 백업
# 2. harness CLI 호출: npx @foundry-x/harness-kit init-monorepo ...
# 3. 완료 메시지
```

### verify.sh

> **구현 역동기화 주석 (S365)**: Design 초안은 "2차 dry-run diff 0건"을 명세했으나,
> 실제 구현은 3-check 방식으로 변경됨 (T5 unit test가 멱등성을 더 정확히 검증).

```bash
# [1/3] grep -r "ktds-axbd|Foundry-X|foundry-x" -- 0건 확인 (식별자 잔존)
# [2/3] 4-package 구조 확인 (packages/api|web|cli|shared 디렉토리 존재)
# [3/3] .nvmrc = "22" 확인
# 출력: ✅ Verify PASS / ❌ + 항목별 실패 목록
# 멱등성: unit test T5 (generateMonorepoScaffold 2회 실행 동일 결과) 로 검증
```

---

## 7. ax-marketplace SKILL.md 설계

```
/ax:init-harness <project-name> <github-org/repo> "<description>" [--cf-account <id>] [--worker-subdomain <name>]

3-step flow:
  Step 1: preflight.sh (환경 점검)
  Step 2: install.sh <args> (Tier 1 설치)
  Step 3: verify.sh (검증)
```

---

## 8. D1 체크리스트 (Stage 3 Exit)

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | harness-kit은 독립 패키지, 주입 사이트 없음 |
| D2 | 식별자 계약 검증 | 6 variables → Handlebars context 1:1 매핑 |
| D3 | Breaking change 영향도 | generateMonorepoScaffold() 신규 함수, 기존 generateScaffold() 영향 0 |
| D4 | TDD Red 파일 존재 | __tests__/scaffold/monorepo.test.ts (Red 커밋 필요) |
