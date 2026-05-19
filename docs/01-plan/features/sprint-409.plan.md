---
code: FX-PLAN-409
title: F675 ax-harness-kit npm publish + 외부 공개 준비 (Sprint 409)
status: Planned
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 409 — F675 ax-harness-kit npm publish + 외부 공개 준비

## §1 목적

S368 ax-harness-kit MVP 완결 (F671~F674 5 F-item 100%) 후속 외부 공개. **@foundry-x/harness-kit → @ktds-axbd/harness-kit으로 scope rename + publish-ready 메타데이터 + LICENSE + CHANGELOG + npm 실 배포 v0.1.0** = 다른 BD 프로젝트가 `npx @ktds-axbd/harness-kit init-monorepo ...`로 즉시 사용 가능 상태 도달.

## §2 배경 + 사전 측정 (S369, fs 실측 34회차)

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| 패키지명 | `@foundry-x/harness-kit` | `@ktds-axbd/harness-kit` |
| `private` | `true` | `false` (제거) |
| `version` | `0.1.0` | `0.1.0` (유지, initial release) |
| `files` | (없음 = 전체) | allowlist: `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE` |
| `publishConfig` | (없음) | `{"access": "public"}` |
| `repository` | (없음) | `https://github.com/KTDS-AXBD/Foundry-X` (directory: packages/harness-kit) |
| `bugs` | (없음) | `https://github.com/KTDS-AXBD/Foundry-X/issues` |
| `homepage` | (없음) | `https://github.com/KTDS-AXBD/Foundry-X/tree/master/packages/harness-kit` |
| `author` | (없음) | `KTDS AX BD <ktds.axbd@gmail.com>` |
| `license` | (없음) | `MIT` (또는 Apache-2.0, 표준 OSS) |
| `keywords` | (없음) | `["cloudflare-workers","scaffold","monorepo","hono","ax-bd","harness"]` |
| `engines.node` | (없음) | `>=22` (deploy.yml 정합) |
| `@types/node` | `^20.0.0` | `^22.0.0` (S363 Node 22 정합) |
| LICENSE 파일 | 부재 | `LICENSE` (MIT, root + harness-kit) |
| CHANGELOG.md | 부재 | `packages/harness-kit/CHANGELOG.md` (Keep a Changelog v0.1.0) |

**Monorepo 영향**: `@foundry-x/harness-kit` import 28건 (gate-x 6 / fx-modules 1 / fx-shaping 1 + workspace deps + pnpm-lock) → 모두 `@ktds-axbd/harness-kit`로 일괄 변경.

**npm 인증**: `npm whoami = ktds-axbd` (현재 로그인 계정) → @ktds-axbd scope publish 가능.

## §3 다음 번호

| 항목 | 값 |
|------|-----|
| F번호 | F675 |
| FX-REQ | FX-REQ-737 |
| Sprint | 409 |

## §4 범위

### (a) Scope rename: @foundry-x → @ktds-axbd (28 files 일괄)

```bash
# 1. package.json
sed -i 's|"@foundry-x/harness-kit"|"@ktds-axbd/harness-kit"|g' packages/*/package.json
# 2. TS source imports
find packages/ -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's|@foundry-x/harness-kit|@ktds-axbd/harness-kit|g' {} +
# 3. pnpm-lock 갱신 (pnpm install 자동)
pnpm install
```

**검증**: `grep -rn "@foundry-x/harness-kit" packages/ --exclude-dir=node_modules` = 0건 (단 archive/docs 제외).

### (b) package.json publish-ready 메타데이터

```json
{
  "name": "@ktds-axbd/harness-kit",
  "version": "0.1.0",
  "description": "AX BD Cloudflare Workers MSA scaffold + harness CLI (auth/CORS/D1/event-bus)",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": { "harness": "dist/cli/index.js" },
  "exports": { ... },
  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"],
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/KTDS-AXBD/Foundry-X.git",
    "directory": "packages/harness-kit"
  },
  "bugs": { "url": "https://github.com/KTDS-AXBD/Foundry-X/issues" },
  "homepage": "https://github.com/KTDS-AXBD/Foundry-X/tree/master/packages/harness-kit",
  "author": "KTDS AX BD <ktds.axbd@gmail.com>",
  "license": "MIT",
  "keywords": ["cloudflare-workers","scaffold","monorepo","hono","ax-bd","harness","d1","msa"],
  "engines": { "node": ">=22" },
  "scripts": { ... },
  "dependencies": { ... },
  "devDependencies": { "@types/node": "^22.0.0", ... },
  "peerDependencies": { "hono": "^4.0.0" }
}
```

### (c) LICENSE 파일 (MIT)

신규: `packages/harness-kit/LICENSE` (표준 MIT, Copyright 2026 KTDS AX BD).

### (d) CHANGELOG.md 작성

신규: `packages/harness-kit/CHANGELOG.md`

```markdown
# Changelog

All notable changes to `@ktds-axbd/harness-kit` will be documented here.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-05-19

### Added
- Initial release: AX BD Cloudflare Workers MSA scaffold + harness CLI
- `harness init-monorepo` — 4-package 골격 scaffold (api/web/cli/shared)
- `harness create` — single service scaffold
- Middleware: `createAuthMiddleware`, `createCorsMiddleware`, `rbac`, `errorHandler`, `createStranglerMiddleware`
- D1 + Event Bus + Strangler Fig + ESLint config exports
- Opt-in flags: `--with-bashrc-patch`, `--with-tmux-patch`, `--with-scripts`, `--with-claude-hooks`, `--with-d1-create`, `--with-git-init`
- Auto SETUP.md + 3-way Node version consistency CI gate
- 102 vitest tests passing
```

### (e) README.md 외부 사용자 대상 보강

기존 297 lines 검토 + 보강:
- Header: `npm install -g @ktds-axbd/harness-kit` 또는 `npx @ktds-axbd/harness-kit init-monorepo ...` 명시
- Badge: npm version, license, node>=22
- Quick Start 절차 검증 + scope rename 반영
- API Reference 정확 확인

### (f) 빌드 + 검증 시퀀스

```bash
cd packages/harness-kit
pnpm build               # tsc + copy templates
pnpm test                # 102/102 PASS
pnpm typecheck           # 0 errors

# npm pack dry-run
npm pack --dry-run       # tarball 내용 확인 (dist/ + README + LICENSE + CHANGELOG + package.json만)

# 사이즈 체크
ls -lh @ktds-axbd-harness-kit-0.1.0.tgz 2>/dev/null
```

### (g) npm 실 배포 (v0.1.0)

```bash
cd packages/harness-kit
# 1) dist 정합성 최종 확인
ls -la dist/

# 2) publish dry-run
npm publish --dry-run --access public

# 3) 실 publish (사용자 승인 후)
npm publish --access public
```

> ⚠️ `npm publish`는 **되돌릴 수 없음**. autopilot은 (1) dry-run까지 진행하고, (2) 실제 publish 명령은 사용자 명시적 승인을 요구 (Plan §6 위험)

### (h) Monorepo workspace dep 영향 검증

`@ktds-axbd/harness-kit` rename 후 모든 monorepo 패키지가 정상 빌드 + 테스트 PASS:
- gate-x (6 imports) typecheck PASS
- fx-modules / fx-shaping workspace dep 정합
- foundry-x-api 기존 코드 회귀 0

### (i) reports + 회귀 test

`reports/sprint-409-publish-readiness.md`:
- npm pack 결과 (tarball 크기, 포함 파일 목록)
- npm publish dry-run 출력
- 실 publish 시점 npm registry URL
- 외부 사용자 quick-start 가이드 검증 결과

회귀 test 추가 검토 (선택): T37 — `package.json fields presence` 검증 (license/repository/files 등 필수 메타 grep).

## §5 Phase Exit — Smoke Reality (P-a~P-l 12항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | scope rename `@foundry-x` → `@ktds-axbd` 일괄 적용 | `grep -rn "@foundry-x/harness-kit" packages/ --exclude-dir=node_modules` = 0건 |
| P-b | package.json `private: false` (또는 필드 제거) | grep |
| P-c | 필수 메타데이터 9종 (description/files/publishConfig/repository/bugs/homepage/author/license/keywords/engines.node) 모두 추가 | grep 9건 모두 발견 |
| P-d | LICENSE 파일 존재 (MIT) | `ls packages/harness-kit/LICENSE` |
| P-e | CHANGELOG.md 존재 + v0.1.0 섹션 | `ls packages/harness-kit/CHANGELOG.md` + grep "0.1.0" |
| P-f | harness-kit vitest 102/102 PASS (회귀 0) | `pnpm -F @ktds-axbd/harness-kit test` |
| P-g | gate-x typecheck PASS (rename 후 회귀 0) | `pnpm -F gate-x typecheck` |
| P-h | fx-modules + fx-shaping workspace dep 정합 | `pnpm install --frozen-lockfile` OK |
| P-i | `npm pack --dry-run` 출력 — dist/ + README + LICENSE + CHANGELOG + package.json만 포함 | tarball 내용 확인 |
| P-j | `npm publish --dry-run --access public` PASS | exit 0 |
| P-k | `npm publish --access public` 실 배포 + npm registry 등록 확인 | `npm view @ktds-axbd/harness-kit` 응답 200 |
| P-l | reports/sprint-409-publish-readiness.md 신규 생성 (npm registry URL 포함) | `ls reports/sprint-409-*.md` ≥ 1 |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| **npm publish 되돌릴 수 없음** | autopilot은 dry-run까지만 자동 진행. 실 `npm publish`는 reports에 명령 명시 + Plan §6 강조 + 사용자 가시 출력. 또는 autopilot이 directly publish하되 실패 시 즉시 알림 |
| `@ktds-axbd` scope 권한 부족 (403) | `npm whoami = ktds-axbd` 확인됨 → public scope publish 가능. fail 시 → unscoped fallback (foundry-x-harness-kit) 후속 sprint 권고 |
| Monorepo workspace `@foundry-x/harness-kit` import 28건 일괄 변경 후 회귀 | `pnpm install` + `turbo run typecheck --force` (S337 cache 우회) + 모든 패키지 vitest 실행 |
| LICENSE 호환성 (MIT vs Apache-2.0) | MIT 채택 (단순 표준 OSS, GitHub 자동 인식). 사용자 별 요청 시 Apache-2.0 변경 가능 |
| `pnpm-lock.yaml` 충돌 | rename 직후 `pnpm install` 1회 → lock 갱신 + commit |
| dist 누락 (tsc 빌드 안 됨) | `pnpm -F @ktds-axbd/harness-kit build` 실행 후 `ls dist/` 확인 + Plan §4(f) 검증 시퀀스 |

## §7 Out-of-scope

- ❌ ax-harness-kit V0.2.0 기능 추가 (별 sprint)
- ❌ MEMORY.md 압축 / rules 명문화 (별 트랙)
- ❌ Foundry-X core 코드 변경 (rename만 영향)
- ❌ GitHub Release tag 생성 (npm publish 후 별 step, 권고만)

## §8 S360 hallucination 회피 강제 (학습 9회차)

- ✅ reports/sprint-409-publish-readiness.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-409.json **f_items=F675 정확** (velocity stale 답습 10회차 차단 시도)
- ✅ design + report 둘 다 자동 생성
- ✅ Phase Exit P-l "reports/sprint-409-*.md ≥ 1 신규" 강제 검증
- ✅ P-k 실 publish 시점 npm registry URL을 report에 명시 (외부 사용자 가시 가능)

## §9 예상 시간

~45~70분 autopilot (rename 28 files + 메타데이터 + LICENSE/CHANGELOG + npm pack + publish dry-run + 실 publish + reports).

## §10 관련 문서

- S368 F674 MVP 완결 report: `reports/sprint-408-dogfood-4th-run.md`
- harness-kit 현재 README: `packages/harness-kit/README.md` (297 lines)
- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- npm `whoami = ktds-axbd` (현재 인증 계정)
