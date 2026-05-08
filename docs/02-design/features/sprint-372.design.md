---
code: FX-DESIGN-372
title: Sprint 372 — F637 zod-openapi 0.18.4 Single-File PoC Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-09
updated: 2026-05-09
sprint: 372
f_item: F637
req: FX-REQ-702
priority: P2
---

# Sprint 372 — F637 Design: zod-openapi 0.18.4 Single-File PoC

## §1 분석 결과

### 0.18.4 Breaking Change

`@hono/zod-openapi` 0.18.x에서 `RouteConfigToTypedResponse<R>`가 **명시적 status code를 필수 요구**. 다중 status(200+401 등) 라우트에서 `c.json(data)` (status 없음) → TypeScript 에러 + 일부 runtime behavior 변경.

### F636 실패 원인 (정밀 분석)

F636 autopilot codemod: `c.json(data)` → `c.json(data, 200)` 35 handlers 일괄 적용.

**production fail trigger** (`POST /api/auth/login` plain POST, no body):
- 0.9.0: no body → `validationHook` → 400 ✓
- F636 후 0.18.4: no body → 500 ✗

**근본 원인 가설**: `validationHook`의 타입 시그니처 `c: { json: (data: unknown, status: number) => Response }` 가 0.18.4에서 incompatible → defaultHook 경로 런타임 오류. 또는 autopilot이 login route의 status code 선언에 잘못된 응답 코드를 추가하여 경계값 실패 발생.

**이 PoC의 목표**: auth.ts만 manual codemod → 4 multi-input probe 검증으로 가설 확증.

### auth.ts 변경 대상 (10 handlers)

| Line | Handler | 현재 | 변경 후 |
|------|---------|------|---------|
| 181 | login 성공 | `c.json({user, ...tokens})` | `c.json({user, ...tokens}, 200)` |
| 265 | refresh 성공 | `c.json(tokens)` | `c.json(tokens, 200)` |
| 323 | switchOrg 성공 | `c.json(tokens)` | `c.json(tokens, 200)` |
| 376 | acceptInvitation 성공 | `c.json(tokens)` | `c.json(tokens, 200)` |
| 409 | invitationInfo 성공 | `c.json(info)` | `c.json(info, 200)` |
| 645 | googleAuth 성공 | `c.json({user, ...tokens})` | `c.json({user, ...tokens}, 200)` |
| 674 | forgotPassword (사용자 없음) | `c.json({message})` | `c.json({message}, 200)` |
| 692 | forgotPassword (이메일 발송) | `c.json({message})` | `c.json({message}, 200)` |
| 718 | validateResetToken 성공 | `c.json({ valid: true })` | `c.json({ valid: true }, 200)` |
| 742 | resetPassword 성공 | `c.json({message})` | `c.json({message}, 200)` |
| 789 | cleanupTokens 성공 | `c.json({ deleted: ... })` | `c.json({ deleted: ... }, 200)` |

**금지**: 다른 파일(14 files × 35 handlers) codemod 적용 안 함 — PoC scope 유지.

## §2 테스트 계약 (TDD Red Target)

### F637 input coverage 회귀 테스트

**파일**: `packages/api/src/__tests__/auth.test.ts`

```typescript
describe('POST /api/auth/login — F637 input coverage', () => {
  it('plain POST no body → 4xx (never 5xx)', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('empty JSON body → 400', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('partial body email only → 400', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  it('malformed JSON → 4xx', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
```

### openapi-spec 회귀 (S336 silent layer 4 유지)

기존 `packages/api/src/__tests__/openapi-spec.test.ts` — 변경 없음, PASS 유지 확인.

## §3 wrangler dev Multi-Input Probe

### 4 Probe 기대 결과

| # | 입력 | 기대 HTTP | F636 상태 | F637 목표 |
|---|------|-----------|-----------|-----------|
| P1 | Plain POST (no body, no content-type) | 4xx | 500 ❌ | ≥400 <500 ✓ |
| P2 | Empty JSON `{}` | 400 | 400 ✓ (zod early-catch) | 400 ✓ |
| P3 | Partial `{"email":"x"}` | 400 | 400 ✓ | 400 ✓ |
| P4 | Full invalid creds | 401 | 401 ✓ | 401 ✓ |

## §4 typecheck 예상

`cd packages/api && pnpm exec tsc --noEmit` (turbo 우회):
- auth.ts 변경으로 packages/api **auth 모듈** 타입 에러 → 0건
- 다른 13 파일(35 handlers 잔여)은 아직 0.9.0 패턴 → 타입 에러 잔존 가능
- PoC 목적: auth.ts fix가 충분한지 + typecheck 잔여 에러 목록 파악

## §5 파일 매핑

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `packages/api/package.json` | `@hono/zod-openapi` `^0.9.0` → `^0.18.4` |
| `packages/fx-agent/package.json` | 동일 |
| `packages/fx-modules/package.json` | 동일 |
| `packages/fx-offering/package.json` | 동일 |
| `packages/fx-shaping/package.json` | 동일 |
| `pnpm-lock.yaml` | `pnpm install` 자동 갱신 |
| `packages/api/src/modules/auth/routes/auth.ts` | 10 handler explicit status code 추가 |
| `packages/api/src/__tests__/auth.test.ts` | F637 input coverage 4 tests 추가 |

### 생성 파일
| 파일 | 내용 |
|------|------|
| `reports/sprint-372-auth-codemod-diff.txt` | `git diff auth.ts` 출력 |
| `reports/sprint-372-master-validation-2026-05-09.md` | 4 probe 결과 + wrangler tail 30s 증거 |

## §6 위험

| 위험 | 대응 |
|------|------|
| R1: wrangler dev 구동 fail (esbuild error) | `wrangler deploy --dry-run` 대체 검증 |
| R2: forgotPassword 단일 status 라우트 타입 에러 | `, 200` 명시 추가 (safety) |
| R3: PoC production deploy 방지 | sprint/372 브랜치 유지, `--skip deploy` 또는 PR merge 보류 |
| R4: 다른 13 파일 타입 에러로 CI fail | PR body에 "PoC — auth.ts only, typecheck partial" 명시 |

## §7 TDD 적용 등급

**필수** (새 테스트 계약): `auth.test.ts` F637 input coverage 4 cases — Red → Green 순서.

---
