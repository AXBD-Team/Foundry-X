# Sprint 401 Design — F667 ax-harness-kit Tier 1: Cloudflare 배포 인프라

**Sprint**: 401 | **F-item**: F667 | **REQ**: FX-REQ-729 | **Date**: 2026-05-19

---

## 1. 개요

F666에서 생성된 4-package monorepo 골격에 Cloudflare 배포 인프라를 추가한다.
핵심 변경: `templates/monorepo/` 하위에 `.github/workflows/deploy.yml.hbs` + `scripts/d1-migrate-remote.sh.hbs` 신규 생성, `wrangler.toml.hbs` sub-name 분리.

---

## 2. 아키텍처

```
generateMonorepoScaffold(options)
  ├── packages/api/wrangler.toml    ← [env.dev] + [env.production] sub-name 추가
  ├── .github/workflows/deploy.yml ← NEW: D1 migration + Workers deploy + smoke
  ├── scripts/d1-migrate-remote.sh ← NEW: CF REST API 기반
  └── scripts/smoke-test.sh        ← NEW: /healthz + web check
```

**변수 치환 흐름**:
```
MonorepoScaffoldOptions.projectName → "{{projectName}}" → "proposal-tf-platform"
MonorepoScaffoldOptions.githubOrgLower → "{{githubOrgLower}}" → "ktds-axbd"
MonorepoScaffoldOptions.cloudflareAccount → "{{cloudflareAccount}}" → "b6c06059..."
MonorepoScaffoldOptions.workerSubdomain → "{{workerSubdomain}}" → "ktds-axbd"
```

---

## 3. 파일별 상세 설계

### 3.1 `wrangler.toml.hbs` (UPDATE)

```toml
name = "{{projectName}}-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
account_id = "{{cloudflareAccount}}"

[[d1_databases]]
binding = "DB"
database_name = "{{projectName}}-db"
database_id = "<RUN: wrangler d1 create {{projectName}}-db --account-id {{cloudflareAccount}}>"
migrations_dir = "src/db/migrations"

[vars]
GITHUB_REPO = "{{githubOrg}}/{{githubRepo}}"
ENVIRONMENT = "production"

# Local development
[env.dev]
name = "{{projectName}}-api-dev"

[[env.dev.d1_databases]]
binding = "DB"
database_name = "{{projectName}}-db"
database_id = "<SAME_AS_ABOVE>"
migrations_dir = "src/db/migrations"

# Production environment (sub-name 분리)
[env.production]
name = "{{projectName}}-api-production"

[[env.production.d1_databases]]
binding = "DB"
database_name = "{{projectName}}-db"
database_id = "<SAME_AS_ABOVE>"
migrations_dir = "src/db/migrations"
```

### 3.2 `deploy.yml.hbs` (CREATE — `monorepo/.github/workflows/`)

3-job 파이프라인: test → deploy-api + deploy-web (parallel) → smoke-test

**핵심 설계 결정**:
- Node 22 (coding-style.md 준수)
- `paths-ignore`: SPEC.md / docs/ / .claude/ (meta-only commit skip)
- `concurrency: cancel-in-progress: false` (D1 migration 안전)
- GitHub Actions `${{ }}` ↔ Handlebars `{{ }}` 충돌 방지: `${{ "{{" }} secrets.X {{ "}}" }}`

### 3.3 `d1-migrate-remote.sh.hbs` (CREATE — `monorepo/scripts/`)

Foundry-X `scripts/d1-migrate-remote.sh` 기반 파라미터화:
- `ACCOUNT_ID="{{cloudflareAccount}}"` (변수 치환)
- `MIGRATIONS_DIR="packages/api/src/db/migrations"` (고정)
- `DATABASE_ID="<RUN: wrangler d1 create {{projectName}}-db ...>"` (설치 후 수동 채움)

### 3.4 `smoke-test.sh.hbs` (CREATE — `monorepo/scripts/`)

Foundry-X smoke-test.sh 기반 파라미터화:
- `API_URL="https://{{projectName}}-api.{{workerSubdomain}}.workers.dev"`
- `/healthz` 200 체크
- Web `/` 200 체크

### 3.5 `generator.ts` (UPDATE)

```typescript
// before
cloudflareAccount: options.cloudflareAccount ?? "<YOUR_CLOUDFLARE_ACCOUNT_ID>",
// after
cloudflareAccount: options.cloudflareAccount ?? "b6c06059b413892a92f150e5ca496236",
```

---

## 4. TDD 테스트 계약

| # | 입력 | 기대 출력 |
|---|------|----------|
| T7 | generateMonorepoScaffold({projectName: "proj-x", ...}) | `packages/api/wrangler.toml` 내 `[env.dev]` + `name = "proj-x-api-dev"` + `[env.production]` + `name = "proj-x-api-production"` |
| T8 | generateMonorepoScaffold({projectName: "proj-x", ...}) | `.github/workflows/deploy.yml` 존재 + `d1 migrations apply proj-x-db --remote` 포함 |
| T9 | generateMonorepoScaffold({projectName: "proj-x", ...}) | `deploy.yml` 내 `smoke-test:` job 존재 |
| T10 | generateMonorepoScaffold({projectName: "proj-x", ...}) | `scripts/d1-migrate-remote.sh` 존재 + `proj-x` 포함 |

---

## 5. 파일 매핑 (§5 표준)

| 파일 | 작업 유형 | TDD 등급 |
|------|----------|----------|
| `src/scaffold/templates/monorepo/packages/api/wrangler.toml.hbs` | UPDATE | T7 (필수) |
| `src/scaffold/templates/monorepo/.github/workflows/deploy.yml.hbs` | CREATE | T8, T9 (필수) |
| `src/scaffold/templates/monorepo/scripts/d1-migrate-remote.sh.hbs` | CREATE | T10 (필수) |
| `src/scaffold/templates/monorepo/scripts/smoke-test.sh.hbs` | CREATE | - |
| `src/scaffold/generator.ts` | UPDATE (default) | - |
| `__tests__/scaffold/monorepo.test.ts` | UPDATE (T7~T10) | Red |
| `skills/init-harness/scripts/install.sh` | UPDATE (install 안내) | - |

---

## 6. 영향 분석

- **기존 T1~T6**: 변경 없음. T6(Foundry-X 식별자 0건)은 `b6c06059...` UUID가 "ktds-axbd" 문자열 아님 → 유지.
- **T5(멱등성)**: deploy.yml + d1-migrate-remote.sh 2회 생성 동일 결과 → 확인 필요.
- **MSA lint**: harness-kit는 api 패키지 아님, 규칙 미적용.

---

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| `.github/` 숨김 디렉토리 복사 누락 | `walkTemplates`는 `entry.name` 그대로 사용 → `.github` 정상 처리 확인 |
| GitHub Actions `${{ }}` ↔ Handlebars 충돌 | `${{ "{{" }} secrets.X {{ "}}" }}` 패턴 (기존 F666 방식 동일) |
| d1-migrate-remote.sh 실행 권한 | `fs.writeFileSync` 후 `chmod +x` 필요 → `walkTemplates` 수정 or `.sh.hbs` 파일 감지 |
