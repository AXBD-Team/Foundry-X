---
code: FX-RPRT-406
title: Sprint 406 — F672 ax-harness-kit Dogfood defects 3종 fix
status: Completed
created: 2026-05-19
sprint: 406
match_rate: 100
f_items: F672
---

# Sprint 406 Report — F672 ax-harness-kit Dogfood defects 3종 fix

## 요약

S365 F671 gate-x Dogfood에서 발견된 결함 3건을 ax-harness-kit 템플릿에서 일괄 수정하고, gate-x 재검증으로 모든 Phase Exit 기준(P-a~P-i) PASS 달성.

## 성과

| 지표 | 값 |
|------|-----|
| Match Rate | **100%** |
| harness-kit tests | **93/93 PASS** (89 → +4 T24~T27) |
| gate-x pnpm install | ✅ PASS (--ignore-scripts 불필요) |
| gate-x pnpm lint | ✅ PASS |
| gate-x pnpm test | ✅ PASS (api smoke 1/1) |
| gate-x pnpm typecheck | ✅ PASS |
| gate-x wrangler dry-run | ✅ 84.62 KiB |
| reports 실파일 | ✅ 1건 (sprint-406-dogfood-rerun.md) |

## D-1 fix (esbuild 버전 충돌)

root `package.json.hbs`에 `pnpm.overrides.esbuild: "^0.25.0"` 추가. vite@6(0.25)와 wrangler@4(0.28)가 공존할 때 발생하던 postinstall 충돌 해소. `--ignore-scripts` 없이 `pnpm install` 8.4초 정상 완료.

## D-2 fix (eslint devDep 누락)

`cli/web/api package.json.hbs`에 eslint@9 + @typescript-eslint 2종 추가. 각 패키지에 `eslint.config.js.hbs` (flat config, eslint@9 native) 신규. `pnpm lint` 3/3 성공.

## D-3 fix (api smoke test 부재)

`packages/api/src/__tests__/app.test.ts.hbs` 신규. `import { app }` (named export 패턴 일치), `/health` endpoint smoke test. `pnpm test` 1/1 PASS. cli/web/shared `vitest.config.ts.hbs`(`passWithNoTests: true`)도 추가하여 test 파일 없는 패키지의 exit 1 해소.

## 추가 관찰

Gap Analysis에서 T24~T27 번호가 F670 기존 테스트(line 515)와 F672 신규 테스트(line 620)에 동시 존재. vitest는 설명 문자열로 ID를 구분하므로 기능 영향 없음. 후속 세션에서 번호 정리 권고.

## TDD 사이클

- **Red**: `9f088fd6` — T24~T27 4건 추가 (4 FAIL 확인)
- **Green**: `8368196e` — 구현 완료 (93/93 PASS)
- **Typecheck**: PASS (0 errors)

## 변경 파일 (13개)

```
수정: package.json.hbs (4종) + monorepo.test.ts
신규: app.test.ts.hbs + eslint.config.js.hbs (3종) + vitest.config.ts.hbs (3종) + dogfood-rerun.md
```

## Phase Exit (P-a~P-i 9/9 ✅)

상세: `reports/sprint-406-dogfood-rerun.md`
