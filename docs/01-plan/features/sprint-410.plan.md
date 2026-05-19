---
code: FX-PLAN-410
title: F676 ax-harness-kit v0.2.0 — multi-tenant + 3 middleware + publish (Sprint 410)
status: Planned
created: 2026-05-20
author: Sinclair Seo
---

# Sprint 410 — F676 @ktds-axbd/harness-kit v0.2.0

## §1 목적

S369 ax-harness-kit MVP 외부 공개 (v0.1.0) 후속 첫 기능 확장. **v0.2.0** = multi-tenant guard + Rate Limit + Request Logger + Trace ID propagation 4종 middleware 도입 + npm 실 publish. 다른 BD 프로젝트가 `npx @ktds-axbd/harness-kit init-monorepo ...` 이후 운영 가능한 통합 미들웨어 스택 완비.

## §2 배경 + 사전 측정 (S370, fs 실측 35회차)

| 항목 | 현재 | v0.2.0 후 |
|------|------|----------|
| version | `0.1.0` (LIVE) | `0.2.0` |
| middleware 개수 | 5 (cors/jwt/rbac/errorHandler/strangler) | 9 (+4 신규) |
| Exports | 5종 함수 + 4 type | 9종 함수 + 8 type |
| 의존 (peer) | hono ^4.0.0 | hono ^4.0.0 (변경 없음) |
| harness-kit tests | 112 | ~140 (+~28 신규) |

**재활용 가능 패턴 (Foundry-X core)**:
- `packages/api/src/middleware/tenant.ts` (49 lines, `tenantGuard`) — JwtPayload.orgId 검증 + D1 멤버십 lookup + bypass paths
- Foundry-X audit-bus trace_id propagation 로직 (F642 / F660)

**npm 인증**: `npm whoami=ktds-axbd` 유지 ✅.

## §3 다음 번호

| 항목 | 값 |
|------|-----|
| F번호 | F676 |
| FX-REQ | FX-REQ-738 |
| Sprint | 410 |

## §4 범위

### (a) Multi-Tenant Guard (`createMultiTenantMiddleware`)

신규 파일: `packages/harness-kit/src/middleware/multi-tenant.ts`

```typescript
import type { Context, Next, MiddlewareHandler } from "hono";
import type { JwtPayload } from "./jwt.js";

export interface MultiTenantConfig {
  /** Paths to skip tenant guard (default: empty) */
  bypassPaths?: string[];
  /** Optional D1 binding for membership verification */
  d1Binding?: string;
  /** Custom error response */
  onMissingOrgId?: (c: Context) => Response;
}

export interface TenantVariables {
  orgId: string;
  orgRole: string;
  userId: string;
}

export function createMultiTenantMiddleware(config: MultiTenantConfig = {}): MiddlewareHandler {
  const bypass = config.bypassPaths ?? [];
  return async (c, next) => {
    if (bypass.some((p) => c.req.path.startsWith(p))) return next();
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    if (!payload?.orgId) {
      return config.onMissingOrgId?.(c) ?? c.json({ error: "Organization context required" }, 403);
    }
    c.set("orgId", payload.orgId);
    c.set("orgRole", payload.orgRole ?? "member");
    c.set("userId", payload.sub);
    return next();
  };
}
```

**Foundry-X tenantGuard와의 차이**:
- D1 lookup은 optional (Foundry-X는 강제)
- bypassPaths 사용자 지정 (Foundry-X는 hardcoded `/api/builder/`)
- onMissingOrgId 커스텀 가능

### (b) Rate Limit (`createRateLimitMiddleware`)

신규 파일: `packages/harness-kit/src/middleware/rate-limit.ts`

```typescript
import type { Context, Next, MiddlewareHandler } from "hono";

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Time window in seconds */
  windowSec: number;
  /** Key function (default: client IP) */
  keyFn?: (c: Context) => string;
  /** KV namespace binding for distributed counter (optional) */
  kvBinding?: string;
}

export function createRateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler {
  const memory = new Map<string, { count: number; reset: number }>();
  return async (c, next) => {
    const key = config.keyFn?.(c) ?? c.req.header("CF-Connecting-IP") ?? "anonymous";
    const now = Date.now();

    // Optional KV-backed distributed counter
    if (config.kvBinding) {
      const kv = (c.env as Record<string, unknown>)[config.kvBinding] as KVNamespace | undefined;
      if (kv) {
        const stored = (await kv.get(key, "json")) as { count: number; reset: number } | null;
        const entry = stored && stored.reset > now ? stored : { count: 0, reset: now + config.windowSec * 1000 };
        if (entry.count >= config.limit) {
          c.header("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
          return c.json({ error: "Rate limit exceeded" }, 429);
        }
        entry.count++;
        await kv.put(key, JSON.stringify(entry), { expiration: Math.ceil(entry.reset / 1000) });
        return next();
      }
    }

    // In-memory fallback (single-instance only)
    const entry = memory.get(key);
    if (!entry || entry.reset <= now) {
      memory.set(key, { count: 1, reset: now + config.windowSec * 1000 });
      return next();
    }
    if (entry.count >= config.limit) {
      c.header("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    entry.count++;
    return next();
  };
}
```

### (c) Request Logger (`createRequestLoggerMiddleware`)

신규 파일: `packages/harness-kit/src/middleware/request-logger.ts`

```typescript
import type { Context, Next, MiddlewareHandler } from "hono";

export interface RequestLoggerConfig {
  /** Log format: 'json' (structured) | 'text' (human) */
  format?: "json" | "text";
  /** Custom logger (default: console.log) */
  logger?: (line: string) => void;
  /** Headers to redact (default: ['authorization', 'cookie']) */
  redactHeaders?: string[];
}

export function createRequestLoggerMiddleware(config: RequestLoggerConfig = {}): MiddlewareHandler {
  const format = config.format ?? "json";
  const log = config.logger ?? console.log;
  const redact = new Set((config.redactHeaders ?? ["authorization", "cookie"]).map((h) => h.toLowerCase()));

  return async (c, next) => {
    const start = Date.now();
    const { method, path } = c.req;
    await next();
    const duration = Date.now() - start;
    const status = c.res.status;
    const traceId = c.get("traceId") as string | undefined;
    if (format === "json") {
      log(JSON.stringify({ method, path, status, duration, traceId, timestamp: new Date().toISOString() }));
    } else {
      log(`[${new Date().toISOString()}] ${method} ${path} ${status} (${duration}ms)${traceId ? ` trace=${traceId}` : ""}`);
    }
  };
}
```

### (d) Trace ID Propagation (`createTraceIdMiddleware`)

신규 파일: `packages/harness-kit/src/middleware/trace-id.ts`

```typescript
import type { Context, Next, MiddlewareHandler } from "hono";

export interface TraceIdConfig {
  /** Header name (default: 'x-trace-id') */
  header?: string;
  /** Generator function (default: crypto.randomUUID()) */
  generator?: () => string;
}

export function createTraceIdMiddleware(config: TraceIdConfig = {}): MiddlewareHandler {
  const headerName = config.header ?? "x-trace-id";
  const gen = config.generator ?? (() => crypto.randomUUID());

  return async (c, next) => {
    const incoming = c.req.header(headerName);
    const traceId = incoming ?? gen();
    c.set("traceId", traceId);
    c.header(headerName, traceId);
    await next();
  };
}
```

### (e) index.ts + types.ts 확장

`src/middleware/index.ts`:
- 4종 신규 함수 export
- TenantVariables / MultiTenantConfig / RateLimitConfig / RequestLoggerConfig / TraceIdConfig type export

`src/index.ts` re-export:
- middleware/index.ts에서 자동 재export

### (f) 회귀 test (vitest, harness-kit)

신규 test 디렉토리: `__tests__/middleware/`
- `multi-tenant.test.ts` (7 tests: bypass / missing orgId / payload propagation / D1 hook / custom onMissingOrgId 등)
- `rate-limit.test.ts` (7 tests: in-memory limit / window expire / Retry-After / KV-backed / custom keyFn 등)
- `request-logger.test.ts` (7 tests: json/text format / redact / duration / traceId integration 등)
- `trace-id.test.ts` (7 tests: incoming/generated / custom header / custom generator / propagation)

총 +28 신규 → harness-kit 112 → **140 tests**.

### (g) CHANGELOG.md v0.2.0 섹션

```markdown
## [0.2.0] - 2026-05-20

### Added
- `createMultiTenantMiddleware` — JWT-based org membership guard
- `createRateLimitMiddleware` — Configurable rate limiting (in-memory + KV-backed)
- `createRequestLoggerMiddleware` — Structured / human request logging with redaction
- `createTraceIdMiddleware` — Trace ID propagation (header-based + custom generator)
- New types: `TenantVariables`, `MultiTenantConfig`, `RateLimitConfig`, `RequestLoggerConfig`, `TraceIdConfig`
- 28 new tests (middleware/, 4 files)

### Changed
- Total tests: 112 → 140
- `package.json version`: 0.1.0 → 0.2.0
```

### (h) README.md API Reference 확장

기존 297 lines + 신규 middleware 4종 섹션 (각 함수 시그니처 + config 옵션 + 예시 코드).

### (i) 빌드 + 검증 시퀀스

```bash
cd packages/harness-kit
pnpm build               # tsc + copy templates
pnpm test                # 140/140 PASS 기대
pnpm typecheck           # 0 errors

# npm pack dry-run
npm pack --dry-run       # tarball 포함 파일 + 사이즈 확인

# Foundry-X monorepo 회귀 (workspace dep)
cd ../..
pnpm turbo run typecheck --force    # 19/19 PASS
pnpm turbo run test --force         # 회귀 0
```

### (j) npm publish v0.2.0 실 배포

```bash
cd packages/harness-kit
npm publish --dry-run --access public  # validation
npm publish --access public            # 실 배포 (사용자 수동)
# → https://www.npmjs.com/package/@ktds-axbd/harness-kit (0.2.0)
```

> ⚠️ F675와 동일한 안전 패턴 적용 — autopilot은 dry-run까지만, 실 publish는 사용자 수동.

### (k) reports

`reports/sprint-410-v0.2.0-publish-readiness.md`:
- 4 신규 middleware 시그니처 + 사용 예시
- 28 신규 test 카테고리별 분류
- npm pack 결과 (tarball 크기, 파일 수)
- v0.2.0 publish 절차 + 사용자 수동 명령
- Foundry-X tenantGuard와의 차이 비교표

## §5 Phase Exit — Smoke Reality (P-a~P-l 12항)

| # | 항목 | PASS 기준 |
|---|------|----------|
| P-a | 4 신규 middleware 파일 존재 | `ls src/middleware/{multi-tenant,rate-limit,request-logger,trace-id}.ts` |
| P-b | index.ts에서 4종 함수 + 5 type export grep | grep `createMultiTenantMiddleware` 등 ≥ 1 each |
| P-c | harness-kit vitest 140/140 PASS (112 + 28 신규) | `pnpm -F @ktds-axbd/harness-kit test` |
| P-d | typecheck 0 errors | `pnpm exec tsc --noEmit` packages/harness-kit |
| P-e | CHANGELOG.md v0.2.0 섹션 추가 | grep `## [0.2.0]` |
| P-f | package.json version 0.2.0 | grep |
| P-g | README.md 4 middleware API Reference 섹션 | grep `createRateLimitMiddleware` 등 |
| P-h | Foundry-X monorepo 회귀 0 (turbo typecheck --force) | exit 0 |
| P-i | npm pack --dry-run 정상 (tarball 사이즈 < 200KB) | manual check |
| P-j | npm publish --dry-run --access public PASS | exit 0 |
| P-k | reports/sprint-410-v0.2.0-publish-readiness.md 신규 | `ls reports/sprint-410-*.md` ≥ 1 |
| P-l | npm publish 실 배포는 사용자 수동 (PR body에 명령 명시) | reports 가이드 + Plan §6 강제 |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| **npm publish v0.2.0 비가역** | F675 안전 패턴 재적용 — autopilot dry-run까지만, 실 publish 사용자 수동 |
| 4 middleware 사이 ordering 의존성 (예: traceId → logger) | README에 권장 ordering 명시 + middleware 자체는 ordering-agnostic |
| crypto.randomUUID() Workers 호환성 | Cloudflare Workers globalThis.crypto 표준 (Web Crypto API) — 호환 |
| KV binding optional 처리 | rate-limit은 KV 없으면 in-memory fallback (single-instance only 명시) |
| Hono v4 type 충돌 | peerDeps `hono: ^4.0.0` 유지, 새 type 추가만 |
| Multi-tenant D1 lookup 미구현 시점 | v0.2.0은 JWT-only verification, D1 hook은 callback으로 확장 가능하게 설계 (v0.3.0 후속) |

## §7 Out-of-scope

- ❌ Cache headers middleware (v0.3.0)
- ❌ Compression middleware (v0.3.0)
- ❌ D1 강제 membership lookup (v0.3.0 — DB schema 별도 결정 필요)
- ❌ GitHub Release tag v0.1.0 / v0.2.0 (별 sprint)
- ❌ MEMORY.md 압축 / rules 명문화 (별 트랙)

## §8 S360 hallucination 회피 강제 (학습 10회차)

- ✅ reports/sprint-410-v0.2.0-publish-readiness.md **신규 실파일 생성 의무화**
- ✅ velocity sprint-410.json **f_items=F676 정확** (velocity stale 답습 11회차 차단 시도)
- ✅ design + report 둘 다 자동 생성
- ✅ Phase Exit P-k "reports 신규" 강제 검증
- ✅ P-l npm publish 실 명령은 reports에 명시 (외부 사용자 가시 + 사용자 수동 강제)

## §9 예상 시간

~60~90분 autopilot (4 middleware + 28 test + index/types 확장 + CHANGELOG/README + npm pack dry-run + 실 publish 가이드).

## §10 관련 문서

- S369 F675 v0.1.0 publish report: `reports/sprint-409-publish-readiness.md`
- npm v0.1.0 LIVE: https://www.npmjs.com/package/@ktds-axbd/harness-kit
- Foundry-X tenantGuard: `packages/api/src/middleware/tenant.ts`
- ax-harness-kit PRD-final: `docs/specs/ax-harness-kit/prd-final.md`
- harness-kit README: `packages/harness-kit/README.md`
