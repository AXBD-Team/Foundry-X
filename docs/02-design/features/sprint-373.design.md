---
code: FX-DSGN-373
title: Sprint 373 — F638 @hono/zod-openapi 0.18.4 본 통합 설계
version: 1.0
status: Active
category: DESIGN
created: 2026-05-09
updated: 2026-05-09
sprint: 373
f_item: F638
req: FX-REQ-703
plan: FX-PLAN-373
---

# Sprint 373 Design — F638 @hono/zod-openapi 0.18.4 본 통합

## §1 목표

`@hono/zod-openapi 0.9.0 → 0.18.4` 업그레이드.
0.18.4 breaking change (Content-Type 없는 POST → body validation skip → undefined) 대응하여
17 handlers에 null guard 일괄 적용. CI smoke multi-input probe 자동화.

## §2 Breaking Change 메커니즘

```
0.18.4 동작:
  POST /api/auth/login (no Content-Type header)
  → body validation SKIP
  → handler: const { email, password } = c.req.valid("json")
  → email=undefined, password=undefined
  → eq(users.email, undefined) → D1_TYPE_ERROR → HTTP 500
```

**null guard 패턴** (auth.ts PR #786 레퍼런스):
```typescript
const { field1, field2 } = c.req.valid("json");
if (!field1 || !field2) {
  return c.json({ error: "field1 and field2 are required", errorCode: "VALIDATION_001" }, 400);
}
```

## §3 변경 파일 매핑

### (a) package.json version bump (5 files)

| 파일 | 변경 |
|------|------|
| `packages/api/package.json` | `@hono/zod-openapi`: `^0.9.0` → `^0.18.4` |
| `packages/fx-agent/package.json` | 동일 |
| `packages/fx-modules/package.json` | 동일 |
| `packages/fx-offering/package.json` | 동일 |
| `packages/fx-shaping/package.json` | 동일 |

### (b) pnpm-lock.yaml (1 file, pnpm install 자동 갱신)

### (c) 17 handlers null guard (16 파일, auth.ts login 이미 완료)

| # | 파일 | handler | fields to check |
|---|------|---------|-----------------|
| 1 | `packages/api/src/modules/auth/routes/auth.ts` | login | `email, password` ✅ 완료 (PR #786) |
| 2 | `packages/api/src/modules/auth/routes/auth.ts` | signup | `email, name, password` |
| 3 | `packages/api/src/modules/auth/routes/auth.ts` | refresh | `refreshToken` |
| 4 | `packages/api/src/modules/auth/routes/auth.ts` | switchOrg | `orgId` |
| 5 | `packages/api/src/modules/auth/routes/admin.ts` | bulkSignup | `orgId, accounts, defaultPassword` |
| 6 | `packages/api/src/modules/auth/routes/sso.ts` | issueHubToken | `orgId` |
| 7 | `packages/api/src/modules/auth/routes/sso.ts` | verifyHubToken | `token` |
| 8 | `packages/api/src/modules/auth/routes/sso.ts` | updateOrgService | `enabled` (config optional) |
| 9 | `packages/api/src/modules/portal/routes/feedback.ts` | submitFeedback | `npsScore` |
| 10 | `packages/api/src/modules/portal/routes/kpi.ts` | trackEvent | `eventType` |
| 11 | `packages/api/src/modules/portal/routes/nps.ts` | dismissSurvey | `surveyId` |
| 12 | `packages/api/src/modules/portal/routes/onboarding.ts` | completeStep | `stepId` |
| 13 | `packages/api/src/modules/portal/routes/org.ts` | createOrg | `name, slug` |
| 14 | `packages/api/src/modules/portal/routes/reconciliation.ts` | reconcile | `strategy` |
| 15 | `packages/api/src/modules/portal/routes/wiki.ts` | updateContent | `content` |
| 16 | `packages/api/src/core/spec/routes/spec.ts` | generateSpec | `text` |
| 17 | `packages/api/src/core/spec/routes/spec.ts` | resolveConflict | `conflictId, resolution` |

### (d) deploy.yml multi-input smoke probe (1 file)

파일: `.github/workflows/deploy.yml`

추가할 smoke-test step:
```yaml
- name: Multi-input smoke probe (POST /api/auth/login)
  run: |
    BASE_URL="https://foundry-x-api.ktds-axbd.workers.dev"
    echo "=== Case 1: no body, no Content-Type ==="
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login")
    [ "$CODE" = "400" ] || [ "$CODE" = "422" ] || (echo "FAIL: expected 4xx got $CODE" && exit 1)
    echo "Case 1 PASS ($CODE)"

    echo "=== Case 2: empty JSON body ==="
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL/api/auth/login")
    [ "$CODE" = "400" ] || [ "$CODE" = "422" ] || (echo "FAIL: expected 4xx got $CODE" && exit 1)
    echo "Case 2 PASS ($CODE)"

    echo "=== Case 3: partial body ==="
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com"}' "$BASE_URL/api/auth/login")
    [ "$CODE" = "400" ] || [ "$CODE" = "401" ] || [ "$CODE" = "422" ] || (echo "FAIL: expected 4xx got $CODE" && exit 1)
    echo "Case 3 PASS ($CODE)"

    echo "=== Case 4: malformed JSON ==="
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d 'not-json' "$BASE_URL/api/auth/login")
    [ "$CODE" = "400" ] || [ "$CODE" = "422" ] || (echo "FAIL: expected 4xx got $CODE" && exit 1)
    echo "Case 4 PASS ($CODE)"

    echo "=== Case 5: valid credentials (expected 4xx - invalid creds) ==="
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"smoke@test.invalid","password":"wrong"}' "$BASE_URL/api/auth/login")
    [ "$CODE" = "401" ] || [ "$CODE" = "400" ] || [ "$CODE" = "422" ] || (echo "FAIL: expected 4xx got $CODE" && exit 1)
    echo "Case 5 PASS ($CODE)"

    echo "All 5 smoke cases PASS — 5xx 0건"
```

### (e) 회귀 test fixture 강화 (auth.test.ts 주요 핸들러)

파일: `packages/api/src/__tests__/auth.test.ts` (또는 근처 test 파일)

auth.ts login 기존 4 test + signup/refresh/switchOrg 핸들러에도 동일 패턴:
```typescript
it("login no body → 400", async () => {
  const res = await app.request("/api/auth/login", { method: "POST" });
  expect(res.status).toBe(400);
});
it("signup no body → 400", async () => {
  const res = await app.request("/api/auth/signup", { method: "POST" });
  expect(res.status).toBe(400);
});
it("refresh no body → 400", async () => {
  const res = await app.request("/api/auth/refresh", { method: "POST" });
  expect(res.status).toBe(400);
});
```

## §4 TDD 체크리스트

| # | 항목 |
|---|------|
| D1 | null guard 추가 위치(17 handlers) 전수 grep 검증 |
| D2 | 각 필드 undefined 시 400 반환 contract |
| D3 | 0.18.4 breaking change — 5 packages version bump 소비자 영향 없음 |
| D4 | TDD Red: auth.test.ts no-body 테스트 먼저 FAIL 확인 (이미 PR #786으로 PASS이므로 회귀 방지용) |

## §5 Worker 파일 매핑

> 단일 구현 (병렬 Agent 불필요 — 16 파일 직접 수정)

**Phase 1: version bump + pnpm install** (5분 예상)
- 5 package.json 수정 + `pnpm install`

**Phase 2: null guard 일괄 적용** (30분 예상)
- 16 handler 파일 순서대로 수정
- auth.ts (signup, refresh, switchOrg)
- admin.ts (bulkSignup)
- sso.ts (issueHubToken, verifyHubToken, updateOrgService)
- portal/ handlers (7개)
- core/spec/ handlers (2개)

**Phase 3: deploy.yml + test fixture** (15분 예상)
- deploy.yml smoke step 추가
- auth.test.ts 회귀 test 보강

**Phase 4: verification** (10분 예상)
- `pnpm exec tsc --noEmit` packages/api
- `pnpm turbo run typecheck/lint/test --force`
