---
code: FX-DESIGN-409
title: F675 ax-harness-kit npm publish + 외부 공개 준비 (Sprint 409)
status: Design
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 409 Design — F675 ax-harness-kit npm publish + 외부 공개 준비

## §1 설계 요약

`@foundry-x/harness-kit` (private, monorepo-only) → `@ktds-axbd/harness-kit` (public, npm registry)
scope rename + publish-ready 메타데이터 일괄 적용 + LICENSE + CHANGELOG + npm 실 배포 v0.1.0

## §2 변경 범위 (실 측정: 36건 across 패키지)

| 파일 유형 | 변경 방법 | 건수 |
|-----------|----------|------|
| `package.json` (workspace deps) | sed in-place | 7개 파일 |
| `.ts` source imports | sed in-place | 15+ 파일 |
| `src/scaffold/templates/*.hbs` | sed in-place (신규 프로젝트 참조) | 3 파일 |
| `README.md` (harness-kit 내부) | sed in-place | 1 파일 |
| `packages/harness-kit/package.json` | 전체 재작성 (메타데이터 추가) | 1 파일 |

총 실측: 36 occurrences (Plan 예상 28건 + 8건 초과)

## §3 파일 매핑 (§5 Work Unit)

### W-1: Scope rename (@foundry-x → @ktds-axbd)

**수정 파일**:
- `packages/harness-kit/package.json` — name 변경 + publish 메타데이터 추가
- `packages/gate-x/package.json` + `src/*.ts` (7건)
- `packages/fx-modules/package.json` + `src/middleware/auth.ts` (2건)
- `packages/fx-shaping/package.json` + `src/*.ts` (3건)
- `packages/fx-offering/package.json` + `src/*.ts` (2건)
- `packages/fx-discovery/package.json` + `src/*.ts` (3건)
- `packages/api/package.json` + `src/routes/proxy.ts` (3건)
- `packages/fx-agent/package.json` + `src/middleware/auth.ts` (2건)
- `packages/harness-kit/README.md` (7건)
- `packages/harness-kit/src/scaffold/templates/*.hbs` (3건)

### W-2: harness-kit package.json 전체 재작성

```json
{
  "name": "@ktds-axbd/harness-kit",
  "version": "0.1.0",
  "description": "AX BD Cloudflare Workers MSA scaffold + harness CLI (auth/CORS/D1/event-bus)",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": { "harness": "dist/cli/index.js" },
  "exports": {
    ".": "./dist/index.js",
    "./eslint": "./dist/eslint/index.js",
    "./events": "./dist/events/index.js",
    "./d1": "./dist/d1/index.js",
    "./scaffold": "./dist/scaffold/generator.js"
  },
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
  "scripts": {
    "build": "tsc && cp -r src/scaffold/templates dist/scaffold/",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "handlebars": "^4.7.8",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "hono": "^4.0.0"
  }
}
```

### W-3: 신규 파일 생성

| 파일 | 내용 |
|------|------|
| `packages/harness-kit/LICENSE` | MIT License, Copyright 2026 KTDS AX BD |
| `packages/harness-kit/CHANGELOG.md` | Keep a Changelog v0.1.0 초판 |

### W-4: README.md 외부 사용자 대상 보강

- Header: `@ktds-axbd/harness-kit` 배지 + npm install 안내
- Quick Start에 `npx @ktds-axbd/harness-kit init-monorepo` 반영
- scope rename 일괄 반영

### W-5: reports + npm pack/publish dry-run

| 파일 | 내용 |
|------|------|
| `reports/sprint-409-publish-readiness.md` | npm pack 결과 + dry-run 출력 + registry URL |

## §4 테스트 계약 (TDD Red Target)

TDD 적용 등급: **권장** (패키지 메타데이터 변경 — 서비스 로직 없음)

- **T37**: `package.json fields presence` — license/repository/files/publishConfig/keywords/engines.node 필수 메타 포함 검증
  - `packages/harness-kit/__tests__/package-meta.test.ts`

## §5 검증 시퀀스

```
1. grep "@foundry-x/harness-kit" packages/ --excl-dir=node_modules → 0건
2. pnpm install (lockfile 재생성)
3. pnpm -F @ktds-axbd/harness-kit build
4. pnpm -F @ktds-axbd/harness-kit test  → 102/102 (or 103 with T37)
5. turbo run typecheck --force           → 19/19 PASS (S337 cache 우회)
6. cd packages/harness-kit && npm pack --dry-run
7. npm publish --dry-run --access public
8. (사용자 승인 후) npm publish --access public
```

## §6 D1/Breaking change 영향 없음

- DB migration 0건
- 공개 API shape 변경 없음 (rename only + 메타데이터)
- monorepo internal: workspace:* dependency → pnpm install로 lockfile 재생성

## §7 리스크 대응

| 리스크 | 대응 |
|--------|------|
| npm publish 되돌릴 수 없음 | autopilot dry-run만 자동, 실 publish 명령 report에 명시 후 사용자 가시 확인 |
| 36건 rename 회귀 | `turbo run typecheck --force` (cache 우회) 필수 |
| @types/node 20→22 업그레이드 | devDependency 버전만 변경, 기존 코드 타입 호환 확인 |
