---
code: FX-RPRT-410
title: Sprint 410 F676 — @ktds-axbd/harness-kit v0.2.0 Publish Readiness
sprint: 410
created: 2026-05-20
author: Sinclair Seo
match_rate: 100%
---

# Sprint 410 — @ktds-axbd/harness-kit v0.2.0 Publish Readiness Report

## 1. Phase Exit 결과 (P-a ~ P-l)

| # | 항목 | 결과 | 상세 |
|---|------|------|------|
| P-a | 4 middleware 파일 존재 | ✅ PASS | `multi-tenant.ts` / `rate-limit.ts` / `request-logger.ts` / `trace-id.ts` 4파일 신규 생성 |
| P-b | index.ts 4 함수 + 5 type export | ✅ PASS | `createMultiTenantMiddleware` + `createRateLimitMiddleware` + `createRequestLoggerMiddleware` + `createTraceIdMiddleware` + 5 types all exported |
| P-c | harness-kit tests 140/140 PASS | ✅ PASS | `Tests: 140 passed (140)` (112 기존 + 28 신규) |
| P-d | typecheck 0 errors | ✅ PASS | `pnpm exec tsc --noEmit` — exit 0, no output |
| P-e | CHANGELOG.md v0.2.0 섹션 | ✅ PASS | `## [0.2.0] - 2026-05-20` 섹션 추가 완료 |
| P-f | package.json version 0.2.0 | ✅ PASS | `"version": "0.2.0"` |
| P-g | README.md 4 middleware API Reference | ✅ PASS | `createMultiTenantMiddleware` / `createRateLimitMiddleware` / `createRequestLoggerMiddleware` / `createTraceIdMiddleware` 4섹션 추가 |
| P-h | Foundry-X 모노리포 회귀 0 (turbo typecheck --force) | ✅ PASS | `Tasks: 19 successful, 19 total` — Cached: 0 (force) |
| P-i | npm pack tarball < 200KB | ✅ PASS | 78KB (v0.1.0: 77KB → +1KB) / 124 files |
| P-j | npm publish --dry-run PASS | ✅ PASS | `ktds-axbd-harness-kit-0.2.0.tgz` 생성 성공 |
| P-k | reports 신규 파일 생성 | ✅ PASS | 본 파일 (`sprint-410-v0.2.0-publish-readiness.md`) |
| P-l | npm publish 사용자 수동 강제 | ✅ PASS | 아래 §4 publish 명령 안내 (autopilot 실행 금지) |

**Phase Exit: 12/12 PASS ✅**

## 2. 신규 Middleware API (v0.2.0)

### 2.1 `createMultiTenantMiddleware(config?)`

JWT payload `orgId`를 검증하고 테넌트 컨텍스트를 주입.

```typescript
import { createMultiTenantMiddleware } from "@ktds-axbd/harness-kit";

app.use("*", createMultiTenantMiddleware({
  bypassPaths: ["/health"],
  onMissingOrgId: (c) => c.json({ error: "Org required" }, 403),
}));
```

| Config | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `bypassPaths?` | `string[]` | `[]` | 검증 우회 경로 |
| `d1Binding?` | `string` | — | D1 멤버십 검증 바인딩 (v0.3.0 완전 구현) |
| `onMissingOrgId?` | `(c) => Response` | 403 JSON | 커스텀 에러 핸들러 |

**vs Foundry-X `tenantGuard`**: D1 lookup optional + bypassPaths 사용자 지정 + onMissingOrgId 커스텀.

### 2.2 `createRateLimitMiddleware(config)`

요청 수 제한. KV 없으면 in-memory fallback.

```typescript
import { createRateLimitMiddleware } from "@ktds-axbd/harness-kit";

app.use("*", createRateLimitMiddleware({
  limit: 100, windowSec: 60,
  kvBinding: "RATE_LIMIT_KV",  // optional
}));
```

| Config | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `limit` | `number` | ✅ | 윈도우당 최대 요청 |
| `windowSec` | `number` | ✅ | 윈도우 크기 (초) |
| `keyFn?` | `(c) => string` | — | 요청 식별 키 함수 |
| `kvBinding?` | `string` | — | KV namespace 바인딩명 |

### 2.3 `createRequestLoggerMiddleware(config?)`

JSON/text 구조화 로깅. 민감 헤더 자동 redact.

```typescript
import { createRequestLoggerMiddleware } from "@ktds-axbd/harness-kit";

app.use("*", createRequestLoggerMiddleware({
  format: "json",
  redactHeaders: ["authorization", "cookie"],
}));
// {"method":"GET","path":"/api","status":200,"duration":12,"traceId":"...","timestamp":"..."}
```

### 2.4 `createTraceIdMiddleware(config?)`

요청 ID 전파. 인입 헤더 재사용 또는 UUID 생성.

```typescript
import { createTraceIdMiddleware } from "@ktds-axbd/harness-kit";

// 권장 ordering: traceId → logger → auth → tenant
app.use("*", createTraceIdMiddleware({ header: "x-trace-id" }));
```

### 2.5 권장 Middleware Ordering

```typescript
app.use("*", createTraceIdMiddleware());           // 1. ID 먼저
app.use("*", createRequestLoggerMiddleware());     // 2. 로깅 (traceId 활용)
app.use("*", createRateLimitMiddleware({ limit: 100, windowSec: 60 }));
app.use("*", createAuthMiddleware(config));        // 3. 인증
app.use("*", createMultiTenantMiddleware());       // 4. 테넌트 (JWT 이후)
```

## 3. 신규 Tests 분류 (28건)

| 파일 | Tests | 커버리지 포인트 |
|------|-------|----------------|
| `multi-tenant.test.ts` | 7 | bypass / no-orgId / orgId propagation / orgRole default / userId / custom handler |
| `rate-limit.test.ts` | 7 | below-limit / exceed 429 / Retry-After / window-reset / keyFn / KV-backed / in-memory |
| `request-logger.test.ts` | 7 | json-format / text-format / auth-redact / duration / traceId / custom-logger / custom-redact |
| `trace-id.test.ts` | 7 | incoming-reuse / uuid-gen / c.set / response-header / custom-header / custom-gen / consistency |

**Total**: 28 신규 / 112 → 140 PASS

## 4. npm publish v0.2.0 — 사용자 수동 실행

> ⚠️ F675 S369 안전 패턴 재적용 — autopilot은 dry-run까지만 실행. 실 publish는 사용자 수동 (비가역 작업).

```bash
# 1. 현재 레지스트리 계정 확인
npm whoami  # → ktds-axbd

# 2. publish dry-run (최종 확인)
cd packages/harness-kit
npm publish --dry-run --access public

# 3. 실 publish (사용자가 직접 실행)
npm publish --access public
# → + @ktds-axbd/harness-kit@0.2.0

# 4. 레지스트리 propagation 확인 (~5-10분 대기)
# https://www.npmjs.com/package/@ktds-axbd/harness-kit
```

## 5. 다른 BD 프로젝트에서 사용

```bash
# init-monorepo 후 v0.2.0 middleware 즉시 사용 가능
npx @ktds-axbd/harness-kit@0.2.0 init-monorepo gate-x ...

# 또는 직접 설치
pnpm add @ktds-axbd/harness-kit@0.2.0

# Hono app에 middleware 적용
import {
  createMultiTenantMiddleware,
  createRateLimitMiddleware,
  createRequestLoggerMiddleware,
  createTraceIdMiddleware,
} from "@ktds-axbd/harness-kit";
```

## 6. Sprint 성과 요약

| 항목 | 수치 |
|------|------|
| Match Rate | 100% |
| 신규 tests | 28 |
| 총 tests | 140 (112 → 140) |
| tarball | 78KB / 124 files |
| typecheck errors | 0 |
| monorepo 회귀 | 0 (19/19 PASS) |
| TDD Red-Green 사이클 | 완료 (4 files × Red→Green) |
