# Sprint 372 F637 — Master Validation Report
**Date**: 2026-05-09 KST  
**Sprint**: 372 | **F-item**: F637 | **REQ**: FX-REQ-702  

---

## §1 PoC 목적 재확인

F636 production fail 정밀 원인 조사:
- `@hono/zod-openapi 0.9.0 → 0.18.4` 버전업
- `POST /api/auth/login` plain POST (no body) → HTTP 500
- 35 handlers × 14 files autopilot codemod 적용 후 발생

**PoC 접근**: auth.ts 단독 파일 manual codemod + multi-input probe 검증

---

## §2 핵심 발견 (Root Cause 정밀 확증)

### 0.18.4 Breaking Change — Content-Type 없는 요청 처리

| 항목 | 0.9.0 동작 | 0.18.4 동작 |
|------|-----------|-------------|
| `POST /login` no Content-Type, no body | `validationHook` 호출 → 400 | body validation **skip** → handler 직접 호출 |
| `c.req.valid("json")` 반환값 | validation 실패 시 undefined (hook 처리) | Content-Type 없으면 `{email: undefined, password: undefined}` |
| handler 내 DB 호출 결과 | hook가 400 반환하여 handler 미호출 | `eq(users.email, undefined)` → `D1_TYPE_ERROR` → 500 |

**F636 production fail 원인 확증**: 0.18.4에서 Content-Type 없는 요청은 body validation을 건너뜀 → defaultHook 미호출 → handler가 `undefined` 값으로 D1 쿼리 → Type error → HTTP 500.

> F636의 autopilot `c.json(data) → c.json(data, 200)` codemod 자체는 문제가 아님. Content-Type 없는 요청에 대한 0.18.4 middleware behavior change가 실제 원인.

---

## §3 auth.ts 변경 내용 (Manual Codemod)

### 변경 파일: `packages/api/src/modules/auth/routes/auth.ts`

| 변경 유형 | 위치 | 내용 |
|----------|------|------|
| **핵심 null guard 추가** | login handler (line ~149) | `if (!email \|\| !password) → 400` |
| explicit status 200 | login success (line ~185) | `, 200` 추가 |
| explicit status 200 | refresh success (line ~266) | `, 200` 추가 |
| 401 response 선언 + 200 | switchOrg route + success | route에 401 추가 + `, 200` |
| 401 response 선언 + 200 | acceptInvitation route + success | route에 401 추가 + `, 200` |
| explicit status 200 | googleAuth success | `, 200` 추가 |
| explicit status 200 | resetPassword success | `, 200` 추가 |
| 401 response 선언 + 200 | cleanupTokens route + success | route에 401 추가 + `, 200` |

**diff**: `reports/sprint-372-auth-codemod-diff.txt` (101 lines)

---

## §4 Multi-Input Probe 결과 (wrangler dev local)

| # | 입력 | HTTP 코드 | 5xx? | 비고 |
|---|------|-----------|------|------|
| P1 | Plain POST (no body, no Content-Type) | **400** | ✅ NONE | null guard 적용 후 정상 |
| P2 | Empty JSON `{}` | **400** | ✅ NONE | zod validation |
| P3 | Partial body `{"email":"x"}` | **400** | ✅ NONE | zod validation |
| P4 | Full invalid credentials | **401** | ✅ NONE | credential 분기 정상 |

**5xx 0건** — F636 fail 패턴 완전 해소.

---

## §5 TypeScript 검증 결과

### auth.ts errors
```
packages/api/src/modules/auth/routes/auth.ts: 0 errors ✅
```

### 전체 packages/api typecheck
```
auth.ts: 0 errors ✅
Other 17 files: TypeScript errors 잔존 (F638 scope — auth.ts 외 35 handlers)
```

**P-e 판정**: auth.ts 완결, 전체 PASS는 F638에서 처리.

---

## §6 테스트 결과

```
auth.test.ts: 12/12 PASS ✅
  - 기존 8 tests: 모두 PASS (회귀 없음)
  - F637 input coverage 4 tests:
    ✓ plain POST no body → 4xx (never 5xx)
    ✓ empty JSON body → 400
    ✓ partial body email only → 400
    ✓ malformed JSON → 4xx
openapi-spec.test.ts: 2/2 PASS ✅ (S336 silent layer 4 유지)
```

---

## §7 wrangler dev exception 관찰

- Boot: health `/api/health` → 401 (인증 필요, 정상)
- 4 probe 실행 후 exception 로그: **0건**
- wrangler log 오류 라인: **0건**

---

## §8 Phase Exit Criteria 판정

| # | 항목 | 결과 |
|---|------|------|
| P-a | auth.ts codemod line-level review | ✅ PASS (101 line diff 검토) |
| P-b | 4 multi-input curl 모두 4xx (5xx 0건) | ✅ PASS |
| P-c | wrangler dev local boot 정상 | ✅ PASS (health 401) |
| P-d | wrangler 30s exception 0건 | ✅ PASS |
| P-e | `pnpm exec tsc --noEmit` auth.ts 0 errors | ✅ PASS (전체는 F638) |
| P-f | login handler line-level diff reports 첨부 | ✅ PASS |
| P-g | 회귀 test 4종 input expectation 명시 | ✅ PASS |
| P-h | dual_ai_reviews hook sprint 372 (확인 대기) | ⏳ PR 생성 후 |
| P-i | `openapi-spec.test.ts` 회귀 0 | ✅ PASS |

**종합**: P-a~P-i 중 P-h 제외 8/8 PASS.

---

## §9 F638 후속 작업 (Out of Scope)

PoC 결과를 바탕으로 F638 본 통합 sprint에서 필요한 작업:

1. **17 files × 35 handlers** explicit status code 추가 (typecheck 완결)
2. **각 handler별 null guard 검토** — login과 동일한 Content-Type 없는 요청 취약점 유무
3. **multi-input smoke probe 자동화** — 4 probe를 CI smoke test에 통합
4. **production deploy 전 multi-input probe DoD** 명시

---

*Sprint 372 F637 PoC — auth.ts single-file, wrangler dev local only, production deploy 없음*
