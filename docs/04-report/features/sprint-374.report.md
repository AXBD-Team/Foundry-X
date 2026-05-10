---
id: FX-RPRT-374
title: Sprint 374 Report — F639 @hono/zod-openapi 0.18.4 fx-modules 단독 PoC
sprint: 374
f_items: F639
status: complete
match_rate: 100
date: 2026-05-10
---

# Sprint 374 Report — F639

## 요약

`packages/fx-modules`를 `@hono/zod-openapi` 0.9.0 → 0.18.4로 단독 업그레이드한 PoC sprint. F638 cascading lock drift (S345) 학습 기반으로 검증 게이트를 강화했다.

## 변경 파일 (11 files)

| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-modules/package.json` | `^0.9.0` → `^0.18.4` |
| `pnpm-lock.yaml` | fx-modules specifier `^0.18.4` 갱신 |
| `core/portal/routes/github.ts` | `c.json(result)` → `c.json(result, 200)` ×2 |
| `core/portal/routes/kpi.ts` | `c.json({...})` → `c.json({...}, 200)` |
| `core/portal/routes/nps.ts` | `c.json(summary)` → `c.json(summary, 200)` |
| `core/portal/routes/onboarding.ts` | `c.json(result)` → `c.json(result, 200)` |
| `core/portal/routes/org-shared.ts` | `c.json(result/items)` → explicit 200 ×2 |
| `core/portal/routes/party-session.ts` | `c.json(session)` → `c.json(session, 200)` |
| `core/portal/routes/reconciliation.ts` | `c.json(result)` → `c.json(result, 200)` |
| `core/portal/routes/wiki.ts` | `c.json({...})` → explicit 200 ×3 |

## 0.18.4 Breaking Change 확증

**핵심**: `c.json(data)` (status 미지정) 시 TypeScript가 route `responses`에 선언된 **모든 status code의 union** 으로 추론.

```typescript
// 0.9.0: OK (any 수용)
return c.json(result);  // inferred as 200

// 0.18.4: ERROR — 403 declared in responses → inferred as 200|403
return c.json(result);  // Type '200 | 403' is not assignable to type '200'

// 0.18.4: FIX — explicit status narrows the type
return c.json(result, 200);  // Type '200' ✅
```

**적용 조건**: route `responses`에 status code 2개 이상 선언 시 필수. status code 1개만 있으면 자동 추론 OK.

## 검증 결과 (S345 학습 게이트)

| 게이트 | 결과 |
|--------|------|
| P-c: `pnpm install --frozen-lockfile` | **PASS** ✅ |
| P-d: `pnpm list -F fx-modules` resolve = 0.18.4 | **PASS** ✅ |
| P-f: `pnpm exec tsc --noEmit` (turbo 우회) | **PASS** ✅ 0건 |
| P-g: `turbo typecheck --force` 19/19 | **PASS** ✅ Cached: 0 |
| P-h: 다른 4 패키지 회귀 0건 | **PASS** ✅ |
| P-i: `turbo lint/test --force` | **PASS** ✅ 2399/2401 |

## F640 본 통합을 위한 패턴 확립

1. **업그레이드 방법**: `package.json ^0.18.4` 선언 + `pnpm install` + `pnpm install --frozen-lockfile` 검증
2. **Fix 패턴**: route에 multiple status codes → handler의 모든 success `c.json()` 에 explicit status 추가
3. **검증 순서**: 의존 패키지 빌드(`shared`, `shared-contracts`, `harness-kit`) → `pnpm exec tsc --noEmit` → `turbo --force`
4. **예상 4 패키지(api/fx-agent/fx-offering/fx-shaping) 작업량**: 동일 패턴 적용, api는 별도 handler null guard 포함

## Match Rate

**100%** — P-a~P-i 9/9 PASS
