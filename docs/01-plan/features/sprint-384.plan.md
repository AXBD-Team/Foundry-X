# Sprint 384 Plan — F649 e2e 인프라 fix (vite proxy backend 미기동 H5 해소)

> **Sprint**: 384 | **F-item**: F649 | **REQ**: FX-REQ-712 | **Priority**: P1
> **Date**: 2026-05-11 | **Session**: S354 | **Mode**: Master 직접 (autopilot 우회)

## 1. 목표

F648 Sprint 383 진단(`reports/sprint-383-e2e-diagnosis.md`)에서 확정된 **H5 단일 인프라 원인** 해소.

**H5 핵심**: vite proxy `/api → http://localhost:3001` + playwright webServer는 `pnpm dev`(3000)만 + e2e.yml에 API server 기동 step **0건** → vite proxy ECONNREFUSED → 26 spec fail.

본 sprint = **단일 PR 옵션 A** (F648 reports §6 권고). playwright.config.ts webServer를 array로 전환하여 web(3000) + api(3001) 동시 기동.

## 2. 사전 측정 (S354, 2026-05-11)

### 2.1 H5 4축 증거 (F648 §0 결론 재확인)

- `packages/web/vite.config.ts:14`: `server.proxy["/api"].target = "http://localhost:3001"`
- `packages/web/playwright.config.ts:27`: `webServer: { command: "pnpm dev", url: "http://localhost:3000" }` — **API 서버(3001) 미언급**
- `.github/workflows/e2e.yml`: `Build shared-contracts → Build shared → Install Playwright → Run e2e` — API server 기동 step **0건**
- CI 로그(`25643143925`): shard 3 (3,4) 첫 1분 내 `/api/task-states?limit=100`, `/api/telemetry/counts`, `/api/telemetry/events` ECONNREFUSED 다발

### 2.2 누적 부채 임계

6 consecutive FAILURE (S353 plan 작성 시 4 → S354 +2 누적). 26 spec 광범위 fail. admin merge 6회 연속(PR #802~#804 등).

## 3. 범위

### 3.1 playwright.config.ts webServer array 전환

```typescript
webServer: [
  {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  {
    command: "pnpm -F @foundry-x/api dev",
    url: "http://localhost:3001/health",  // 또는 api 헬스체크 endpoint
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
],
```

**선택사항**: wrangler dev `--local` 모드 또는 miniflare로 D1/secret 의존성 우회. fallback 검토.

### 3.2 e2e.yml 보강 (선택)

playwright webServer가 자체 기동하므로 e2e.yml에 별 step 추가 불필요. 단 의존성(`pnpm -F api build` 또는 환경변수)이 필요하면 1 step 추가.

### 3.3 local 재현 검증

```bash
# Step 1: single dev (fail 재현)
cd packages/web && pnpm dev &
WEB_PID=$!
pnpm exec playwright test --grep "F267 설치 가이드" --headed
# 기대: fail (ECONNREFUSED)
kill $WEB_PID

# Step 2: dual dev (pass 확증)
cd packages/web && pnpm dev &
WEB_PID=$!
cd packages/api && pnpm dev &
API_PID=$!
sleep 10  # cold-start 대기
pnpm exec playwright test --grep "F267 설치 가이드" --headed
# 기대: pass
kill $WEB_PID $API_PID
```

**측정 항목**: 26 spec 회복률 (Step 1 fail / Step 2 pass 비율).

### 3.4 typecheck + lint + test 회귀 0건

```bash
pnpm turbo run typecheck lint --force  # cache 0건
pnpm turbo run test
```

### 3.5 PR + auto-merge

```bash
git checkout -b sprint/384
git add packages/web/playwright.config.ts SPEC.md docs/01-plan/features/sprint-384.plan.md
git commit -m "feat(e2e): F649 webServer array — web+api 동시 기동 fix"
git push -u origin sprint/384
gh pr create --base master --head sprint/384 --title "feat: F649 e2e 인프라 fix — webServer array (Sprint 384)" --body "..."
gh pr merge <PR#> --auto --squash
```

### 3.6 CI 검증

PR CI 4 shard GREEN + post-merge master push e2e workflow GREEN — **6 consecutive FAILURE 종결 본격 입증**.

## 4. Phase Exit (Smoke Reality 8항)

| ID | 항목 | 판정 기준 |
|----|------|----------|
| P-a | webServer array 적용 + healthcheck 분리 | playwright.config.ts diff |
| P-b | local fail→pass 직접 증거 캡처 | 26 spec 중 1건 이상 fail 재현 + pass 확증 |
| P-c | CI run shard 1+3 FAIL→PASS | gh run view <run_id> --json |
| P-d | 26 spec 회복률 ≥ 80% | 21/26 이상 PASS |
| P-e | typecheck `--force` cache 0건 PASS | turbo log |
| P-f | 회귀 0건 (코드 path 변경 최소) | playwright.config.ts 1 file ± e2e.yml |
| P-g | dual_ai_reviews sprint 384 자동 INSERT ≥ 1건 | hook 49 sprint 연속 |
| P-h | master push 후 e2e GREEN — 6 consecutive FAILURE 종결 | gh run list 7번째 run GREEN |

## 5. 의존

- F648 ✅ (진단 완결)
- 외부 의존 없음 (CI/CD 외부 인프라 무변경)

## 6. 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | `pnpm -F api dev`(wrangler dev) CI에서 D1 binding fail | fallback miniflare `--local` 또는 wrangler `--persist-to /tmp` |
| R2 | webServer array timeout 충돌 | 각 healthcheck URL 분리 + timeout 120s |
| R3 | 26 spec 회복률 80% 미만 | 잔존 selector drift 4 spec(discovery-detail v1 strict mode + offering-pipeline disabled)는 별 F650 분리 |
| R4 | api `pnpm dev`가 wrangler dev면 D1 migration 필요 | 사전 `pnpm -F api d1:migrate:local` 1회 + .dev.vars 복사 |
| R5 | CI에서 webServer 2개 동시 기동 시 동작 차이 | 별 e2e.yml step으로 api server 명시적 start 대체 경로 검토 |

## 7. 예상 시간

**~30~45분 Master 직접**
- Plan 작성 = 5분 (완료)
- playwright.config.ts fix = 10분
- local 재현 검증 = 15분
- PR + auto-merge + CI 대기 = 10~20분

## 8. 시동 시점

**즉시** (본 세션 S354, 5/14 BeSir D-3 이전 완결 목표).

## 9. 다음 사이클 후보 (out of scope)

- F650 selector drift 잔존 fix (discovery-detail-advanced:251 + offering-pipeline:132 등)
- F640 P1 zod-openapi 4 packages 본 통합
- 5/14 BeSir D-3 dry-run 사전 점검
