# Sprint 406 Dogfood Re-run Report — F672 ax-harness-kit Dogfood defects 3종 fix

**Date**: 2026-05-19  
**Sprint**: 406  
**F-item**: F672 (FX-REQ-734)  
**Scaffold target**: gate-x (KTDS-AXBD/gate-x)  
**CLI command**: `harness init-monorepo gate-x KTDS-AXBD gate-x "Gate-X validation service" --with-bashrc-patch --with-tmux-patch --with-scripts --with-claude-hooks`

---

## Phase Exit Checklist (P-a ~ P-h)

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| P-a | D-1 root package.json `pnpm.overrides.esbuild` | ✅ PASS | `"esbuild": "^0.25.0"` |
| P-b | D-2 cli/web/api eslint devDep | ✅ PASS | 3종 `"eslint": "^9.0.0"` |
| P-c | D-3 api `__tests__/app.test.ts` 파일 존재 | ✅ PASS | `src/__tests__/app.test.ts` |
| P-d | harness-kit vitest 93/93 PASS | ✅ PASS | T24~T27 신규 포함 |
| P-e | gate-x `pnpm install` (no `--ignore-scripts`) | ✅ PASS | 8.4s, esbuild@0.25.12 |
| P-f | gate-x `pnpm lint` | ✅ PASS | 3 tasks successful, 1.065s |
| P-g | gate-x `pnpm test` | ✅ PASS | 6/6 tasks successful |
| P-h | gate-x `pnpm typecheck` + `wrangler dry-run` | ✅ PASS | 4/4 typecheck + 84.62 KiB dry-run |
| P-i | reports/sprint-406-dogfood-rerun.md 신규 | ✅ PASS | 이 파일 |

---

## D-1 Fix: esbuild 버전 충돌 해소

**증상**: vite@6 (esbuild@0.25) + wrangler@4 (esbuild@0.28) 공존 시 postinstall 충돌

**수정**: root `package.json.hbs`에 `pnpm.overrides.esbuild: "^0.25.0"` 추가

**검증**:
```
pnpm install 실행 결과:
  .../esbuild@0.25.12/node_modules/esbuild postinstall: Done
  Done in 8.4s  ← --ignore-scripts 없이 PASS
```

---

## D-2 Fix: eslint devDependency 누락 해소

**증상**: cli/web/api `package.json.hbs`에 lint script만 있고 eslint 설치 없음 → `eslint: not found`

**수정**:
- `packages/{cli,web,api}/package.json.hbs`에 eslint devDeps 3종 추가:
  - `"eslint": "^9.0.0"`
  - `"@typescript-eslint/eslint-plugin": "^8.0.0"`
  - `"@typescript-eslint/parser": "^8.0.0"`
- `packages/{cli,web,api}/eslint.config.js.hbs` 신규 (flat config)

**검증**:
```
pnpm lint 실행 결과:
  @ktds-axbd/gate-x-api:lint: > eslint src ← eslint 정상 실행
  Tasks: 3 successful, 3 total, Time: 1.065s
```

---

## D-3 Fix: api smoke test 부재 해소

**증상**: `packages/api/src/__tests__/` 없음 → vitest "No test files found" exit 1

**수정**: `packages/api/src/__tests__/app.test.ts.hbs` 신규 추가

```typescript
// 생성된 파일 (gate-x projectName 치환 확인)
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("gate-x api smoke", () => {
  it("GET /health responds without server error", async () => {
    const res = await app.request("/health");
    expect(res.status).toBeLessThan(500);
  });
});
```

**검증**:
```
@ktds-axbd/gate-x-api:test:
  ✓ src/__tests__/app.test.ts (1 test) 6ms
  Test Files  1 passed (1)
  Tests  1 passed (1)
```

---

## 추가 Fix: cli/web/shared passWithNoTests

**증상**: cli/shared 패키지에 test 파일 없어 "No test files found" exit 1 → turbo test 전체 FAIL

**수정**: `packages/{cli,web,shared}/vitest.config.ts.hbs` 신규 (`passWithNoTests: true`)

---

## harness-kit Tests 결과

```
Test Files  12 passed (12)
Tests       93 passed (93)  (89 기존 + T24~T27 4 신규)
Duration    753ms
```

## S365 대비 개선 사항

| 항목 | S365 (F671) | S406 (F672) |
|------|-------------|-------------|
| pnpm install | `--ignore-scripts` 필요 | ✅ 불필요 |
| pnpm lint | `eslint: not found` | ✅ PASS |
| pnpm test | api: "No test files found" | ✅ 1 passed |
| wrangler dry-run | ✅ 84.62 KiB | ✅ 84.62 KiB |
