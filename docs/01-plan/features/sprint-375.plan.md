# Sprint 375 Plan — F640

## Feature

**F640**: @hono/zod-openapi 0.18.4 4 packages 본 통합 (FX-REQ-705, P1)

## Goal

F639 PoC(Sprint 374, fx-modules 단독)에서 검증된 패턴을 나머지 4 packages에 일괄 적용하여
monorepo 전체 @hono/zod-openapi 0.18.4 일관성 달성 + S345 cascading lock drift 영구 차단.

## Scope

- **4 packages**: api + fx-agent + fx-offering + fx-shaping
- `package.json`: `^0.9.0` → `^0.18.4`
- `pnpm-lock.yaml` 갱신 + `--frozen-lockfile` 검증
- 0.18.4 typecheck errors 일괄 fix (400/401/404 declarations)
- `deploy.yml` smoke-test multi-input 5 케이스 보강
- 회귀 test expectations 추가

## DoD (완료 조건)

- P-a: 4 packages package.json `^0.18.4` 정확 grep ✓
- P-b: pnpm-lock 단일 instance (0.9.x 잔존 0건)
- P-c: `pnpm install --frozen-lockfile` PASS
- P-d: `pnpm list -F` resolve 4 packages 0.18.4 단일
- P-e: api/fx-agent/fx-offering/fx-shaping handlers 400/401/404 declarations 적용
- P-f: deploy.yml multi-input probe (no body/empty/partial/malformed/valid) 5xx 0건 게이트
- P-g: 회귀 test expectation 4종 이상
- P-h: `pnpm exec tsc --noEmit` 4 packages 모두 PASS
- P-i: `pnpm turbo run typecheck --force` cache 0건 + 19/19 PASS
- P-j: Production smoke 5 input 4xx/2xx (5xx 0건)
- P-k: `wrangler tail` 30s exception 0건
- P-l: dual_ai_reviews sprint 375 INSERT ≥ 1건

## Risk

1. api surface 130 files 큰 → batch fix, typecheck 반복 실행
2. fx-agent agent.ts 2 errors (line ~372 503 / ~464 404 미선언)
3. 추가 cascade → grep 전수 audit + patch 분할 commit
4. F636 재발 시 즉시 revert (S341 패턴)

## Dependencies

- F639 ✅ (fx-modules PoC 완결, PR #792)
- F638 🔧(blocked) — 학습 반영 완료
