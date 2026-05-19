# Sprint 409 — F675 Publish Readiness Report

**Date**: 2026-05-19  
**Sprint**: 409  
**F-item**: F675 ax-harness-kit npm publish + 외부 공개 준비  
**Author**: autopilot (Claude Sonnet 4.6)

## Summary

`@foundry-x/harness-kit` (private, monorepo-only) → `@ktds-axbd/harness-kit` (public, npm registry v0.1.0)

## Phase Exit Checklist

| # | 항목 | 결과 |
|---|------|------|
| P-a | scope rename 0건 잔여 | ✅ PASS (`grep "@foundry-x/harness-kit"` = 0) |
| P-b | private 필드 제거 | ✅ PASS |
| P-c | 필수 메타데이터 9종 | ✅ PASS (description/files/publishConfig/repository/bugs/homepage/author/license/keywords/engines.node) |
| P-d | LICENSE 파일 존재 (MIT) | ✅ PASS |
| P-e | CHANGELOG.md + v0.1.0 섹션 | ✅ PASS |
| P-f | harness-kit vitest 112/112 PASS | ✅ PASS (102 기존 + T37 10건 신규) |
| P-g | typecheck 19/19 --force PASS | ✅ PASS |
| P-h | pnpm install (lockfile 재생성) | ✅ PASS |
| P-i | npm pack --dry-run 결과 | ✅ PASS (see below) |
| P-j | npm publish --dry-run | ⚠️ 권한 제한으로 자동 미실행 (Plan §4(g): 사용자 승인 필요) |
| P-k | npm publish 실 배포 | ⏳ PENDING (사용자 수동 실행 필요) |
| P-l | reports/sprint-409-publish-readiness.md | ✅ PASS (이 파일) |

## npm pack --dry-run 결과

```
Package: @ktds-axbd/harness-kit v0.1.0
Size: 76,964 bytes (~77 KB packed, 225,405 bytes unpacked)
Files: 116 total
```

**tarball 포함 파일 (주요)**:
- `CHANGELOG.md` ✅
- `LICENSE` ✅
- `README.md` ✅
- `dist/` — 모든 컴파일된 JS + .d.ts ✅
- `package.json` ✅

**tarball 제외**: `src/`, `__tests__/`, `tsconfig.json`, `vitest.config.ts` (files allowlist 정상 동작)

## npm publish 수동 실행 방법

```bash
cd packages/harness-kit

# 1. npm 로그인 상태 확인
npm whoami  # → ktds-axbd

# 2. publish dry-run (최종 확인)
npm publish --dry-run --access public

# 3. 실 배포
npm publish --access public

# 4. 등록 확인
npm view @ktds-axbd/harness-kit
```

## Scope Rename 검증

```
변경된 파일: 36 occurrences → 0 remaining
패키지: 8개 (gate-x, fx-modules, fx-shaping, fx-offering, fx-discovery, api, fx-agent, harness-kit)
템플릿: 3개 (.hbs files for scaffold)
README.md: 7건
```

## Test Results

```
Test Files: 13 passed (13)
Tests:      112 passed (112)    (기존 102 + T37 10건)
Duration:   ~1.17s
```

## Typecheck (S337 cache 우회 --force)

```
Tasks:  19 successful, 19 total
Cached: 0 cached, 19 total       ← cache 우회 완전 확인
Time:   33.452s
```

## npm Registry (실 배포 후 갱신 필요)

```
# 배포 완료 시:
npm view @ktds-axbd/harness-kit
# → https://www.npmjs.com/package/@ktds-axbd/harness-kit
```

## Quick Start (외부 사용자)

```bash
# 전역 설치
npm install -g @ktds-axbd/harness-kit

# 또는 npx 직접 실행
npx @ktds-axbd/harness-kit init-monorepo \
  --name my-project \
  --with-d1-create \
  --with-git-init
```
