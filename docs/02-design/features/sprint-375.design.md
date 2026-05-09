# Sprint 375 Design — F640

## §1 Context

**F640**: @hono/zod-openapi 0.18.4 4 packages 본 통합
**의존**: F639 ✅ (fx-modules PoC), F638 🔧(blocked) revert 학습

0.18.4 breaking change: 핸들러에서 emit하는 status code가 route `responses` 객체에 선언되지 않으면 TypeScript 타입 에러 발생.

## §2 패키지별 scope

| package | surface | 알려진 오류 | 위험도 |
|---------|---------|-----------|--------|
| api | 130 files / 156 statements / 103 routes | sso/feedback/kpi/nps 5 errors | HIGH |
| fx-agent | 23 files / 33 statements / 16 routes | agent.ts 2 errors (line 372/464) | MED |
| fx-offering | 7 files / 7 statements / 13 routes | 미측정 (low risk) | LOW |
| fx-shaping | 12 files / 12 statements / 15 routes | 미측정 (low risk) | LOW |

## §3 Fix 패턴 (F639/PR #790 패턴 동일)

handler에서 emit하는 status code를 route `responses`에 추가:

```typescript
// 변경 전: 400 emit but responses에 미선언
responses: {
  200: { content: ..., description: "..." },
},

// 변경 후: 400 추가
responses: {
  200: { content: ..., description: "..." },
  400: {
    content: { "application/json": { schema: z.object({ error: z.string() }) } },
    description: "Bad Request",
  },
},
```

## §4 deploy.yml multi-input smoke probe

현재 smoke-test step: login 단일 케이스 (no body → 500 취약)
변경 후: 5 케이스 gate (no body / empty `{}` / partial / malformed / valid)

```yaml
- name: Multi-input smoke probe
  run: |
    BASE_URL="https://foundry-x-api.ktds-axbd.workers.dev"
    FAIL=0
    # no body
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login")
    [ "$CODE" = "4"* ] || [ "$CODE" = "2"* ] || { echo "FAIL no-body: $CODE"; FAIL=1; }
    # 5xx check (any input must not return 5xx)
    for CODE in $CODE1 $CODE2 $CODE3 $CODE4; do
      echo "$CODE" | grep -q "^5" && { echo "FAIL 5xx: $CODE"; FAIL=1; }
    done
    [ $FAIL -eq 0 ] || exit 1
```

## §5 파일 매핑

### Step 1: package.json 4건 (병렬)
- `packages/api/package.json`: `^0.9.0` → `^0.18.4`
- `packages/fx-agent/package.json`: `^0.9.0` → `^0.18.4`
- `packages/fx-offering/package.json`: `^0.9.0` → `^0.18.4`
- `packages/fx-shaping/package.json`: `^0.9.0` → `^0.18.4`

### Step 2: pnpm install
- `pnpm-lock.yaml` 갱신

### Step 3: typecheck fix (오류 발생 파일 대상)
- `packages/api/src/modules/auth/routes/sso.ts` — 400 declarations
- `packages/api/src/modules/portal/routes/feedback.ts` — 400 declarations
- `packages/api/src/modules/portal/routes/kpi.ts` — 400 declarations
- `packages/api/src/modules/portal/routes/nps.ts` — 400 declarations
- `packages/fx-agent/src/routes/agent.ts` — 503/404 declarations (line ~372/464)
- 추가 오류 발견 시 패치

### Step 4: deploy.yml
- `.github/workflows/deploy.yml` — smoke-test step 보강

### Step 5: reports
- `reports/sprint-375-api-diff.md`
- `reports/sprint-375-fx-agent-diff.md`
- `reports/sprint-375-fx-offering-diff.md`
- `reports/sprint-375-fx-shaping-diff.md`

## §6 검증 게이트 (P-a~P-l)

1. `grep "@hono/zod-openapi.*0.18" packages/{api,fx-agent,fx-offering,fx-shaping}/package.json`
2. `grep "0.9.0" pnpm-lock.yaml | wc -l` → 0
3. `pnpm install --frozen-lockfile` → PASS
4. `pnpm list -F packages/api --depth=2 | grep zod-openapi` → 0.18.x
5. `pnpm exec tsc --noEmit` × 4 packages
6. `pnpm turbo run typecheck --force` cache 0건 + 19/19
7. multi-input smoke (5 cases, 5xx 0건)
