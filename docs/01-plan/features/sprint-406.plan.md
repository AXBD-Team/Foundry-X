---
code: FX-PLAN-406
title: F672 ax-harness-kit Dogfood defects 3종 fix (Sprint 406)
status: Planned
created: 2026-05-19
author: Sinclair Seo
---

# Sprint 406 — F672 ax-harness-kit Dogfood defects 3종 fix

## §1 목적

S365 F671 gate-x Dogfood에서 발견된 결함 3건(D-1 esbuild 충돌 / D-2 eslint devDep 누락 / D-3 api smoke test 부재)을 ax-harness-kit 템플릿에서 일괄 fix → gate-x scaffold 재검증 → 100% PASS 도달.

## §2 배경 (S365 F671 Dogfood findings)

| ID | 결함 | 증상 | 권고 |
|----|------|------|------|
| D-1 | esbuild 버전 충돌 | vite@6 (esbuild@0.25) + wrangler@4 (esbuild@0.28) 공존 시 postinstall 충돌 | `overrides` 설정 또는 wrangler root 이동 |
| D-2 | eslint devDep 누락 | cli/web/api `package.json.hbs`에 lint script만 있고 eslint devDep 부재 → `eslint: not found` | eslint + @typescript-eslint/* devDep 추가 |
| D-3 | api smoke test 부재 | `packages/api/src/__tests__/` 디렉토리 자체 없음 → vitest "No test files found" exit 1 | app.request() 기반 smoke test 1건 templates |

P-f / P-h / P-i 각각 PARTIAL 판정 — 본 sprint에서 PASS 전환.

## §3 사전 측정 (fs 실측, S283 패턴 31회차)

| 항목 | 값 |
|------|-----|
| 다음 F번호 | F672 |
| 다음 FX-REQ | FX-REQ-734 |
| 다음 Sprint | 406 |
| 영향 templates | `packages/harness-kit/src/scaffold/templates/monorepo/` |
| D-1 영향 파일 | root `package.json.hbs` (overrides 추가) 또는 `api/package.json.hbs` (wrangler 위치 변경) |
| D-2 영향 파일 | `packages/{cli,web,api}/package.json.hbs` 3종 |
| D-3 영향 파일 | `packages/api/src/__tests__/app.test.ts.hbs` 신규 |
| 회귀 test | `packages/harness-kit/__tests__/scaffold/*.test.ts` (현재 89건) |
| harness-kit dist 빌드 | ✅ (S365 build) |

## §4 범위

### (a) D-1 fix — esbuild 버전 충돌 해소

**옵션 A (Recommended)**: root `package.json.hbs`에 `pnpm.overrides` 추가
```jsonc
"pnpm": {
  "overrides": {
    "esbuild": "^0.25.0"
  }
}
```

**옵션 B**: wrangler를 root devDep으로 이동 (api/package.json.hbs에서 제거)
- 모노리포 패턴 일관성 ↑, 단 wrangler가 api 패키지에서만 사용되므로 의미 약함

autopilot 판단: 옵션 A 우선 시도, vite@6와 wrangler@4 모두 동작 시 PASS.

### (b) D-2 fix — eslint devDep 추가

3개 패키지 `package.json.hbs`의 `devDependencies` 블록에 추가:
```json
"eslint": "^9.0.0",
"@typescript-eslint/eslint-plugin": "^8.0.0",
"@typescript-eslint/parser": "^8.0.0"
```

추가로 root에 `eslint.config.js.hbs` 또는 패키지별 `.eslintrc.cjs.hbs` 신규 (사용자가 기대하는 lint 동작 명시).

### (c) D-3 fix — api smoke test 템플릿 신규

신규 파일: `packages/harness-kit/src/scaffold/templates/monorepo/packages/api/src/__tests__/app.test.ts.hbs`

```typescript
import { describe, expect, it } from "vitest";
import app from "../app";

describe("{{projectName}} api smoke", () => {
  it("GET /health 응답 정상", async () => {
    const res = await app.request("/health");
    expect(res.status).toBeLessThan(500);
  });
});
```

생성자(`generateMonorepoScaffold`)에 신규 템플릿 처리 추가.

### (d) 회귀 test 보강 (vitest, harness-kit)

`__tests__/scaffold/` 디렉토리에 신규 test T34~T37:
- T34: D-1 root package.json.hbs `pnpm.overrides.esbuild` 존재
- T35: D-2 cli/web/api eslint devDep 존재 (3건)
- T36: D-3 api `__tests__/app.test.ts.hbs` 파일 출력 존재
- T37: scaffold 후 `findFiles("**/*.test.ts")` ≥ 1 (api)

기존 89 test PASS + 4 신규 = 93 tests.

### (e) Dogfood 재검증 (gate-x scaffold 재실행)

```bash
# 본 sprint WT에서:
rm -rf /tmp/gate-x-dogfood-406
node packages/harness-kit/dist/cli/index.js init-monorepo gate-x KTDS-AXBD gate-x \
  "Gate-X validation service" \
  --output /tmp/gate-x-dogfood-406 \
  --with-bashrc-patch --with-tmux-patch --with-scripts --with-claude-hooks

cd /tmp/gate-x-dogfood-406
pnpm install            # P-f: ✅ PASS 기대 (--ignore-scripts 불필요)
pnpm typecheck          # P-g: ✅ PASS
pnpm lint               # P-h: ✅ PASS (이전 PARTIAL → PASS 전환)
pnpm test               # P-i: ✅ PASS (이전 PARTIAL → PASS 전환)
pnpm build              # P-j: ✅ PASS
```

### (f) reports 생성

`reports/sprint-406-dogfood-rerun.md`:
- 본 sprint 후 P-f/P-h/P-i 모두 PASS 확증 + 재실행 출력 첨부
- D-1/D-2/D-3 fix line-level diff 첨부

## §5 Phase Exit — Smoke Reality (P-a~P-j 10항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | D-1 root package.json.hbs `pnpm.overrides.esbuild` grep ≥ 1 | `grep -c '"esbuild"' templates/monorepo/package.json.hbs` ≥ 1 |
| P-b | D-2 cli/web/api 3종 eslint devDep grep | 각각 `"eslint":` 존재 |
| P-c | D-3 api `__tests__/app.test.ts.hbs` 파일 존재 | `ls templates/monorepo/packages/api/src/__tests__/app.test.ts.hbs` |
| P-d | harness-kit vitest 93/93 PASS (89 + 4 신규) | `pnpm -F @foundry-x/harness-kit test` |
| P-e | gate-x 재검증 `pnpm install` (no --ignore-scripts) PASS | exit 0 |
| P-f | gate-x 재검증 `pnpm lint` PASS | exit 0 (eslint installed) |
| P-g | gate-x 재검증 `pnpm test` PASS | exit 0 (api smoke test 발견 + PASS) |
| P-h | gate-x 재검증 `pnpm typecheck + build + wrangler dry-run` 회귀 0 | 4 commands exit 0 |
| P-i | reports/sprint-406-dogfood-rerun.md 신규 | `ls reports/sprint-406-*.md` ≥ 1 |
| P-j | dual_ai_reviews D1 INSERT sprint 406 ≥ 1건 (hook 67 sprint streak) | manual check |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| pnpm overrides가 vite@6 또는 wrangler@4 동작 깨뜨림 | 옵션 B (wrangler root 이동) 또는 esbuild 0.28.x로 통일 |
| eslint@9 config flat 형식 vs cjs 호환성 이슈 | `eslint.config.js` flat config 사용 (eslint@9 native) |
| api smoke test가 실 env 의존 (D1, secrets) → CI fail | `app.request("/health")` 같은 dependency-less endpoint만 사용, 또는 `--skip` 표기 |
| autopilot이 D-1 옵션 A/B 판단 미흡 | Plan §4(a) 옵션 A 우선 명시, 실패 시 옵션 B fallback |

## §7 Out-of-scope

- ❌ I-1 D1 database_id 자동 생성 (별 F-item)
- ❌ I-2 SETUP.md 자동 생성 (별 F-item)
- ❌ I-3 git init 자동화
- ❌ I-4/I-5 (드리프트 CI)
- ❌ ax-harness-kit npm publish 검토 (별 트랙)

## §8 S360 hallucination 회피 강제 (학습 6회차)

- ✅ reports/sprint-406-dogfood-rerun.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-406.json **f_items=F672 정확** + autopilot stale "F671" 답습 차단 prompt 명시 (velocity 답습 패턴 차단 7회차 시도)
- ✅ design + report 둘 다 자동 생성
- ✅ Phase Exit P-i "reports/sprint-406-*.md ls 결과 ≥ 1 신규" 강제 검증

## §9 예상 시간

~30~50분 autopilot (3 defects fix + 4 신규 회귀 test + gate-x 재검증).

## §10 관련 문서

- S365 F671 Dogfood findings: `reports/sprint-405-harness-dogfood-findings.md`
- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- S365 plan: `docs/01-plan/features/sprint-405.plan.md`
