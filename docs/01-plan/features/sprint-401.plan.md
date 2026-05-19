# Sprint 401 Plan — F667 ax-harness-kit Tier 1: Cloudflare 배포 인프라

**Sprint**: 401 | **F-item**: F667 | **REQ**: FX-REQ-729 | **Date**: 2026-05-19

---

## 1. Context

F667: ax-harness-kit Tier 1 — Cloudflare 배포 인프라 + Dogfood 1건
PRD: `docs/specs/ax-harness-kit/prd-final.md` §4.1 M5 + §4.3 S1
의존: F666 ✅ (init-harness 스킬 + 3단계 스크립트 + 변수 치환 + 4-package 골격)

**목표**: F666이 생성한 4-package 골격에 Cloudflare 배포 인프라(wrangler.toml sub-name + deploy.yml + d1-migrate-remote.sh)를 추가하여 신규 프로젝트가 즉시 CI/CD 배포 가능한 상태로 이식.

---

## 2. 스코프

### In-Scope (F667 = M5 + S1)

| 항목 | 세부 | 우선순위 |
|------|------|----------|
| (a) wrangler.toml sub-name 분리 | `[env.dev]` + `[env.production]` 섹션 추가, 기본 `account_id` = ktds-axbd UUID | P0 |
| (b) deploy.yml 전체 파이프라인 | `templates/monorepo/.github/workflows/deploy.yml.hbs` — Node 22 + D1 migration + Workers deploy + smoke job | P0 |
| (c) d1-migrate-remote.sh 템플릿 | `templates/monorepo/scripts/d1-migrate-remote.sh.hbs` — 변수 치환 + Cloudflare REST API | P0 |
| (d) smoke-test.sh 템플릿 | `templates/monorepo/scripts/smoke-test.sh.hbs` — /healthz + web 기본 체크 | P0 |
| (e) TDD T7~T10 | 4개 신규 테스트 (sub-name / deploy.yml 생성 / D1 migration step / d1-migrate-remote.sh) | P0 |
| (f) Dogfood 생성 검증 | `init-harness proposal-tf-platform ...` dry-run 실행 → 생성 파일 내용 확인 | P0 |

### Out-of-Scope (LOCKED)

- proposal-tf-platform 실제 prod 배포 → 사용자 수동 (Cloudflare wrangler deploy 인증 필요)
- .claude/rules/ 9 파일 변수화 → F668
- bashrc + tmux 옵트인 → F669
- .claude/settings.json hooks → F670

---

## 3. Baseline (fs 실측)

```
현재 상태 (F666 완료 후):
templates/
  .github/workflows/deploy.yml.hbs    ← OLD: Node 20, single pkg, D1 migration 미포함 (단일 서비스용)
  monorepo/
    packages/api/wrangler.toml.hbs    ← sub-name 환경 분리 미포함
    (NO .github/ → deploy.yml 포함 안 됨)
    (NO scripts/ → d1-migrate-remote.sh 없음)

F667에서 추가/변경할 파일:
  monorepo/packages/api/wrangler.toml.hbs     ← UPDATE: [env.dev] + [env.production] 추가
  monorepo/.github/workflows/deploy.yml.hbs   ← CREATE: 신규 위치 + 전체 파이프라인
  monorepo/scripts/d1-migrate-remote.sh.hbs   ← CREATE: REST API 기반 migration
  monorepo/scripts/smoke-test.sh.hbs          ← CREATE: healthz + web 체크
```

---

## 4. 구현 파일 매핑

### packages/harness-kit (TypeScript + Templates)

| 파일 | 작업 | TDD |
|------|------|-----|
| `src/scaffold/templates/monorepo/packages/api/wrangler.toml.hbs` | UPDATE: `[env.dev]`, `[env.production]` sub-name 섹션 추가 | T7 |
| `src/scaffold/templates/monorepo/.github/workflows/deploy.yml.hbs` | CREATE: 신규 + 전체 파이프라인 (Node 22, D1 migration, smoke) | T8, T9 |
| `src/scaffold/templates/monorepo/scripts/d1-migrate-remote.sh.hbs` | CREATE: 변수 치환 + CF REST API | T10 |
| `src/scaffold/templates/monorepo/scripts/smoke-test.sh.hbs` | CREATE: 기본 smoke 체크 | - |
| `src/scaffold/generator.ts` | UPDATE: default cloudflareAccount = `b6c06059b413892a92f150e5ca496236` | - |
| `__tests__/scaffold/monorepo.test.ts` | UPDATE: T7~T10 추가 | Red |

### ax-marketplace plugin

| 파일 | 작업 |
|------|------|
| `skills/init-harness/scripts/install.sh` | UPDATE: 다음 단계 안내 (Cloudflare 배포 포함) + CF_ACCOUNT 기본값 |

---

## 5. TDD Red Targets (T7~T10)

```typescript
// T7: wrangler.toml sub-name env sections
it("T7: should include [env.dev] and [env.production] sub-name sections", ...);

// T8: deploy.yml is generated with D1 migration step
it("T8: should generate .github/workflows/deploy.yml with D1 migration step", ...);

// T9: deploy.yml has smoke-test job
it("T9: should generate deploy.yml with smoke-test job", ...);

// T10: d1-migrate-remote.sh is generated
it("T10: should generate scripts/d1-migrate-remote.sh with project variables", ...);
```

---

## 6. Dogfood 검증 계획

```bash
# 1. Build harness-kit
pnpm --filter @foundry-x/harness-kit build

# 2. Init proposal-tf-platform (dry output)
node packages/harness-kit/dist/cli/index.js init-monorepo \
  proposal-tf-platform KTDS-AXBD proposal-tf-platform "제안TF 지원 플랫폼" \
  --cf-account b6c06059b413892a92f150e5ca496236 \
  --worker-subdomain ktds-axbd \
  --output /tmp/proposal-tf-platform-test

# 3. Verify 4-축
grep -q '[env.dev]' /tmp/proposal-tf-platform-test/packages/api/wrangler.toml     # ✅ sub-name
[ -f /tmp/proposal-tf-platform-test/.github/workflows/deploy.yml ]                # ✅ deploy.yml
grep -q 'd1 migrations apply' /tmp/proposal-tf-platform-test/.github/workflows/deploy.yml  # ✅ D1
[ -f /tmp/proposal-tf-platform-test/scripts/d1-migrate-remote.sh ]                # ✅ migrate script
```

---

## 7. Phase Exit (Smoke Reality)

| # | 항목 | 기준 |
|---|------|------|
| P-a | T7~T10 all GREEN | vitest PASS 확인 |
| P-b | T1~T6 회귀 없음 | 기존 67 tests + 4 신규 = 71 tests PASS |
| P-c | `.github/workflows/deploy.yml` 생성 확인 | `generateMonorepoScaffold` 결과 파일 목록 포함 |
| P-d | `[env.production]` sub-name 확인 | wrangler.toml 내용 검증 |
| P-e | `d1-migrate-remote.sh` 생성 확인 | scripts/ 디렉토리 파일 존재 |
| P-f | Foundry-X 식별자 0건 (T6 유지) | ktds-axbd / foundry-x / Foundry-X 잔존 0 |
| P-g | msa-lint PASS | `pnpm turbo lint` |
| P-h | typecheck PASS | `pnpm turbo typecheck --force` |
