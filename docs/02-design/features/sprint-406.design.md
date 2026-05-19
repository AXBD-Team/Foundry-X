---
code: FX-DESIGN-406
title: F672 ax-harness-kit Dogfood defects 3종 fix (Sprint 406)
status: Designed
created: 2026-05-19
author: Sinclair Seo
sprint: 406
---

# Sprint 406 Design — F672 ax-harness-kit Dogfood defects 3종 fix

## §1 목적

S365 F671 gate-x Dogfood에서 발견된 결함 D-1/D-2/D-3를 harness-kit 템플릿에서 일괄 수정 후 회귀 테스트 93건 PASS + gate-x 재검증으로 종결.

## §2 현황 분석 (fs 실측)

| 항목 | 현황 |
|------|------|
| root package.json.hbs | `pnpm.overrides` 블록 없음 |
| cli/web/api package.json.hbs | `eslint` devDep 없음, lint script만 존재 |
| api/__tests__ | 디렉토리 없음, `app.test.ts.hbs` 없음 |
| 기존 harness-kit tests | 89건 |
| generator.ts | `walkTemplates` 재귀 탐색 — 신규 hbs 파일 자동 처리 (별도 코드 수정 불필요) |

## §3 TDD Red Target

```
packages/harness-kit/__tests__/scaffold/monorepo.test.ts
  T24: root package.json에 pnpm.overrides.esbuild 존재
  T25: cli/web/api package.json에 eslint devDep 존재 (3건)
  T26: api __tests__/app.test.ts 파일 출력 존재
  T27: scaffold 후 api test 파일 1건 이상
```

## §4 Composite Score 기준

- Gap Analysis ≥ 93% (Design §5 파일 매핑 vs 구현)
- harness-kit vitest 89 → 93 PASS

## §5 파일 매핑

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/harness-kit/src/scaffold/templates/monorepo/package.json.hbs` | `pnpm.overrides.esbuild` 추가 (D-1) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/cli/package.json.hbs` | eslint devDeps 3종 추가 (D-2) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/web/package.json.hbs` | eslint devDeps 3종 + vitest 추가 (D-2) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/api/package.json.hbs` | eslint devDeps 3종 추가 (D-2) |
| `packages/harness-kit/__tests__/scaffold/monorepo.test.ts` | T24~T27 4건 추가 (TDD Red) |

### 신규 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/api/src/__tests__/app.test.ts.hbs` | smoke test 템플릿 신규 (D-3) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/cli/eslint.config.js.hbs` | eslint flat config (eslint@9) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/web/eslint.config.js.hbs` | eslint flat config (eslint@9) |
| `packages/harness-kit/src/scaffold/templates/monorepo/packages/api/eslint.config.js.hbs` | eslint flat config (eslint@9) |
| `reports/sprint-406-dogfood-rerun.md` | gate-x 재검증 결과 보고서 |

## §6 D-1 상세 설계 (esbuild 충돌 해소)

**선택: 옵션 A** — root `package.json.hbs`에 `pnpm.overrides` 추가

```json
"pnpm": {
  "overrides": {
    "esbuild": "^0.25.0"
  }
}
```

근거: vite@6가 esbuild@0.25를 사용하므로 0.25.x로 통일. wrangler@4의 내부 번들러는 자체 esbuild를 격리하므로 영향 최소.

## §7 D-2 상세 설계 (eslint devDep)

추가 devDeps (cli/web/api 공통):
```json
"eslint": "^9.0.0",
"@typescript-eslint/eslint-plugin": "^8.0.0",
"@typescript-eslint/parser": "^8.0.0"
```

각 패키지에 `eslint.config.js.hbs` 추가 (eslint@9 flat config 형식):
```js
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  { files: ["src/**/*.ts"], languageOptions: { parser: tsParser }, plugins: { "@typescript-eslint": tsPlugin } }
];
```

## §8 D-3 상세 설계 (api smoke test)

`packages/api/src/__tests__/app.test.ts.hbs`:
```typescript
import { describe, expect, it } from "vitest";
import app from "../app.js";

describe("{{projectName}} api smoke", () => {
  it("GET /health responds without server error", async () => {
    const res = await app.request("/health");
    expect(res.status).toBeLessThan(500);
  });
});
```

`__tests__` 디렉토리는 walkTemplates가 재귀적으로 생성하므로 별도 generator 수정 없음.

## §9 Out-of-scope

- eslint.config.js를 root에 추가하는 것 (패키지별 구성이 모노리포 패턴)
- wrangler 버전 업그레이드
- CI workflow 추가
