---
code: FX-PLAN-372
title: Sprint 372 — F637 zod-openapi 0.18.4 Single-File PoC + auth login 정밀 원인 조사
version: 1.0
status: Active
category: PLAN
created: 2026-05-09
updated: 2026-05-09
sprint: 372
f_item: F637
req: FX-REQ-702
priority: P2
---

# Sprint 372 — F637 zod-openapi 0.18.4 Single-File PoC

> SPEC.md §5 F637 row가 권위 소스. 본 plan은 F636(Sprint 371) production fail 후속 PoC — `rules/development-workflow.md` "Autopilot Production Smoke Test" 14+16회차 변종 권장사항 정착 적용.

## §1 배경

### F636 fail 분기

**Sprint 371 / PR #783** (2026-05-08 KST):
- 5 packages `@hono/zod-openapi` `^0.9.0` → `^0.18.4` 일괄 버전업
- typecheck 19/19 PASS + lint 0 + test 2395/2397 + CI green + openapi-spec 2/2 PASS
- master merge → deploy-msa ✅ + deploy-api ✅
- **smoke-test FAIL**: `POST /api/auth/login` HTTP 500 (plain POST, no body)
- 사용자 인터뷰 → revert PR #784 → master `2da3594f`
- **production downtime ~4h 41m** (17:07 ~ 21:48 KST)

### Commit `5c43f8fc` 메시지 분석

```
- 0.18.x breaking: RouteConfigToTypedResponse<R> requires explicit status code
- Fix pattern: c.json(data) → c.json(data, 200) in multi-status routes (35 handlers, 14 files)
- mcp.ts 500 response 선언 추가, auth.ts 401 response 선언 추가 (missing status definitions)
```

→ autopilot이 일괄 codemod로 `c.json(data)` → `c.json(data, 200)` 35건 적용 + auth.ts에 401 response 선언 추가했지만, **login handler 분기에서 logic 깨뜨림** (typecheck PASS but runtime 일부 분기 fail).

### 진정 fail trigger 조건

- ✅ JSON body 있는 요청 (`-d '{}'` 또는 `{"email":"x"}`) → 400 (zod validation 분기에서 early-catch)
- ❌ Plain POST no body → HTTP 500 (auth.ts handler 분기 진입 후 logic fail)

→ smoke-test가 `curl -X POST <endpoint>` plain POST를 시도해서 5xx trigger.

## §2 PoC scope (single file)

### 인터뷰 2회 패턴 (S343)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 PoC scope | **Single file (auth.ts)** | F636 fail 지점 정밀 재현 + 변경 영향 최소 |
| 2차 시동 | **즉시 sprint 372 autopilot** | F636 revert 후 24h 이내 분석 가치 高 |

### 범위 — 5 packages 일괄 install + auth.ts만 codemod

- (a) `pnpm install` 시 5 packages 모두 0.18.4 install 강제 (workspace symlink 일관성, single instance 보장)
- (b) **auth.ts만 manual codemod** — autopilot 일괄 codemod 금지 (F636 fail 패턴 회피), line-level review

## §3 단계별 절차

### Step 1: 환경 준비

```bash
cd packages/api
# package.json: "@hono/zod-openapi": "^0.18.4" 변경
sed -i 's|"@hono/zod-openapi": "\^0.9.0"|"@hono/zod-openapi": "^0.18.4"|' package.json

# fx-* 5 패키지도 동시 적용 (pnpm-lock 일관성)
for pkg in fx-agent fx-modules fx-offering fx-shaping; do
  sed -i 's|"@hono/zod-openapi": "\^0.9.0"|"@hono/zod-openapi": "^0.18.4"|' "packages/$pkg/package.json"
done
# fx-discovery: zod-openapi 미사용 skip

cd .. && pnpm install
```

### Step 2: auth.ts manual codemod

**대상 파일**: `packages/api/src/modules/auth/routes/auth.ts`

**정확 변경 범위**:
1. 401 response 선언 추가 (createRoute responses)
2. login handler `c.json(data)` → `c.json(data, 200)` (성공 경로만)
3. 401 분기는 `c.json(error, 401)` 명시
4. 500 분기 처리 — `c.json(error, 500)` 또는 try/catch wrapper

**금지 (autopilot 일괄 codemod)**: 다른 35 handler는 codemod 적용 안 함. auth.ts 단독.

### Step 3: typecheck (turbo 우회, S337 함정 회피)

```bash
cd packages/api && pnpm exec tsc --noEmit
# 예상: PASS (auth.ts 401 response 선언 + status code 명시)
```

### Step 4: wrangler dev local 구동

```bash
cd packages/api
pnpm wrangler dev --local --port 8787 &
WRANGLER_PID=$!
sleep 5  # boot 대기

# health check
curl -s http://localhost:8787/api/health -o /dev/null -w "HTTP=%{http_code}\n"
# 예상: 401 (인증 필수, 정상)
```

### Step 5: Multi-input curl probe (4종)

```bash
# Probe 1: Plain POST no body
curl -X POST http://localhost:8787/api/auth/login -w "\nHTTP=%{http_code}\n"
# 기대: 400/415/422 (4xx) — 5xx면 FAIL, F636 동일 패턴

# Probe 2: Empty JSON
curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:8787/api/auth/login -w "\nHTTP=%{http_code}\n"
# 기대: 400 (zod validation)

# Probe 3: Partial valid
curl -X POST -H "Content-Type: application/json" -d '{"email":"x"}' http://localhost:8787/api/auth/login -w "\nHTTP=%{http_code}\n"
# 기대: 400 (zod validation)

# Probe 4: Full valid (mock account)
curl -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}' http://localhost:8787/api/auth/login -w "\nHTTP=%{http_code}\n"
# 기대: 401 (credential 분기 정상)
```

### Step 6: wrangler tail 30s 관찰

```bash
# 별 터미널에서
pnpm wrangler tail --format=pretty &
TAIL_PID=$!
# 위 4 probe 다시 실행 + 30초 대기
sleep 30
kill $TAIL_PID
# 기대: exception/throw stack 0건
```

### Step 7: line-level diff + reports 첨부

```bash
git diff packages/api/src/modules/auth/routes/auth.ts > reports/sprint-372-auth-codemod-diff.txt
# reports/sprint-372-master-validation-2026-05-09.md 작성:
#   - 4 probe HTTP code 결과
#   - wrangler tail 30s exception 0건 증거
#   - auth.ts line-level review (변경 line 별 정합성)
```

### Step 8: 회귀 test 보강

**파일**: `packages/api/src/__tests__/auth.test.ts`

추가 expectation:
```typescript
describe('POST /api/auth/login — F637 input coverage', () => {
  it('plain POST no body → 4xx (no 5xx)', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('partial body {"email":"x"} → 400', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  it('malformed JSON → 400', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    expect(res.status).toBe(400);
  });
});
```

### Step 9: PR 생성

PR body에 명시:
- F636 fail 패턴 분석
- single-file PoC scope 명시 (autopilot 일괄 codemod 금지)
- 4 probe HTTP code 결과 (5xx 0건)
- wrangler tail 30s exception 0건
- 회귀 test 4종 expectation 추가

## §4 Phase Exit Criteria — Smoke Reality

| # | 항목 | 검증 |
|---|------|------|
| P-a | auth.ts codemod 정확 적용 | `git diff modules/auth/routes/auth.ts` line-level review PASS |
| P-b | 4 multi-input curl 모두 4xx (5xx 0건) | reports/...md HTTP code 표 |
| P-c | wrangler dev local boot 정상 | health check 401 응답 |
| P-d | wrangler tail 30s exception 0건 | tail log 첨부 |
| P-e | `pnpm exec tsc --noEmit` packages/api PASS (turbo 우회) | terminal output |
| P-f | login handler line-level diff reports 첨부 | reports/sprint-372-auth-codemod-diff.txt |
| P-g | 회귀 test 4종 input expectation 명시 | auth.test.ts grep 검증 |
| P-h | dual_ai_reviews hook sprint 372 자동 INSERT ≥ 1건 | D1 query |
| P-i | `openapi-spec.test.ts` 회귀 0 (S336 silent layer 4 견고화 유지) | test PASS |

## §5 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | single file install 불가 (transitive dep 충돌) | 5 fx-* 동시 install fallback (pnpm-lock 일관성) |
| R2 | wrangler dev local 구동 fail | `wrangler deploy --dry-run` 대체 |
| R3 | auth.ts manual codemod 외 다른 handler 영향 | autopilot에 "auth.ts만 codemod" 명시 (다른 35 handler 0건 변경) |
| R4 | PoC 시 production deploy 위험 | 본 sprint는 production deploy 안 함 (PR merge 보류, master push 시 deploy 자동 trigger 회피 — `[skip deploy]` 또는 별 브랜치 유지) |
| R5 | PoC 결과 0.18.4 호환 확증 시 후속 통합 | **F638 본 통합 sprint 별도 시동** — 5 packages 일괄 + production smoke multi-input 보강 |

## §6 다음 사이클 후보 (out of scope)

1. **F638 본 통합** — 0.18.4 5 packages 일괄 + production smoke multi-input 4 probe 자동화
2. **F627 service-proxy + llm → core/infra/** — services/ cleanup 시리즈 연속
3. **AI Foundry W19 BeSir 5/15 D-6** — Conditional 게이트 카운트다운

## §7 의존

- F636 🔧(blocked) revert ✅ (PR #784 master `2da3594f`)
- F635 ✅ (S336 silent layer 6 영구 해소, content-sync-check.sh fix)

## §8 예상 시간

~45~90분 autopilot (single file scope + multi-input probe + wrangler tail manual review)

---

**시동**: `bash -i -c "sprint 372"` (Master 세션에서)
**Plan SSOT**: 본 문서 (FX-PLAN-372)
**Spec SSOT**: SPEC.md §5 F637 row
