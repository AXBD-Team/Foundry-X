---
code: FX-DESIGN-410
title: F676 ax-harness-kit v0.2.0 — 4 middleware + 28 tests + publish
status: Approved
sprint: 410
created: 2026-05-20
author: Sinclair Seo
---

# Sprint 410 Design — F676 @ktds-axbd/harness-kit v0.2.0

## §1 목적

harness-kit v0.1.0 (LIVE) 위에 4종 production-grade middleware 추가 + 28 신규 tests + npm v0.2.0 publish-ready.

## §2 신규 파일 목록

### §2.1 Middleware 구현 (4 files)

| 파일 | 함수 | 타입 export |
|------|------|-------------|
| `src/middleware/multi-tenant.ts` | `createMultiTenantMiddleware` | `MultiTenantConfig`, `TenantVariables` |
| `src/middleware/rate-limit.ts` | `createRateLimitMiddleware` | `RateLimitConfig` |
| `src/middleware/request-logger.ts` | `createRequestLoggerMiddleware` | `RequestLoggerConfig` |
| `src/middleware/trace-id.ts` | `createTraceIdMiddleware` | `TraceIdConfig` |

### §2.2 Tests (4 files, 28 tests)

| 파일 | Tests |
|------|-------|
| `__tests__/middleware/multi-tenant.test.ts` | 7 |
| `__tests__/middleware/rate-limit.test.ts` | 7 |
| `__tests__/middleware/request-logger.test.ts` | 7 |
| `__tests__/middleware/trace-id.test.ts` | 7 |

## §3 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/middleware/index.ts` | 4 함수 + 5 type re-export 추가 |
| `src/index.ts` | middleware/index.ts에서 자동 재export (변경 없음 — 현재 `export *` 아니라 명시적 export이므로 추가 필요) |
| `package.json` | version `0.1.0` → `0.2.0` |
| `CHANGELOG.md` | `## [0.2.0]` 섹션 추가 (첫 줄 앞) |
| `README.md` | API Reference 섹션에 4 middleware 추가 |

## §4 테스트 계약 (TDD Red Target)

### multi-tenant.test.ts (7 tests)
1. bypass path면 next() 통과
2. jwtPayload 없으면 403 반환
3. orgId 없으면 403 반환
4. orgId 있으면 c.set("orgId") 전파
5. orgRole 기본값 "member" 설정
6. userId = payload.sub 설정
7. onMissingOrgId 커스텀 핸들러 사용

### rate-limit.test.ts (7 tests)
1. limit 이하 요청은 통과
2. limit 초과 시 429 반환
3. Retry-After 헤더 설정
4. 윈도우 만료 후 카운터 리셋
5. 커스텀 keyFn 사용
6. KV-backed (mock) — KV 있으면 KV 사용
7. KV 없으면 in-memory fallback

### request-logger.test.ts (7 tests)
1. json format 로그 출력
2. text format 로그 출력
3. authorization 헤더 redact (log에 미포함)
4. duration ms 기록
5. traceId 포함
6. 커스텀 logger 함수 사용
7. 커스텀 redactHeaders 설정

### trace-id.test.ts (7 tests)
1. x-trace-id 헤더 있으면 그대로 사용
2. 헤더 없으면 crypto.randomUUID() 생성
3. c.set("traceId") 전파
4. 응답에 x-trace-id 헤더 추가
5. 커스텀 header 이름 사용
6. 커스텀 generator 함수 사용
7. 생성된 traceId가 응답 헤더와 c.var 일치

## §5 파일 매핑 (Gap Analysis 기준)

| 신규 파일 | 담당 기능 |
|----------|----------|
| `packages/harness-kit/src/middleware/multi-tenant.ts` | createMultiTenantMiddleware |
| `packages/harness-kit/src/middleware/rate-limit.ts` | createRateLimitMiddleware |
| `packages/harness-kit/src/middleware/request-logger.ts` | createRequestLoggerMiddleware |
| `packages/harness-kit/src/middleware/trace-id.ts` | createTraceIdMiddleware |
| `packages/harness-kit/__tests__/middleware/multi-tenant.test.ts` | T1~T7 multi-tenant |
| `packages/harness-kit/__tests__/middleware/rate-limit.test.ts` | T8~T14 rate-limit |
| `packages/harness-kit/__tests__/middleware/request-logger.test.ts` | T15~T21 request-logger |
| `packages/harness-kit/__tests__/middleware/trace-id.test.ts` | T22~T28 trace-id |
| `reports/sprint-410-v0.2.0-publish-readiness.md` | 발행 준비 보고서 |

| 수정 파일 | 변경 내용 |
|----------|----------|
| `packages/harness-kit/src/middleware/index.ts` | 4 함수 + 5 type export 추가 |
| `packages/harness-kit/src/index.ts` | 4 함수 + 5 type export 추가 |
| `packages/harness-kit/package.json` | version 0.2.0 |
| `packages/harness-kit/CHANGELOG.md` | v0.2.0 섹션 |
| `packages/harness-kit/README.md` | API Reference 4 middleware |

## §6 완료 기준

- harness-kit 112 → **140 tests PASS**
- typecheck 0 errors
- npm pack --dry-run < 200KB
- reports 신규 파일 존재
