# Sprint 387 Plan — F652 master push CI 회귀 fix

**Feature**: F652 (FX-REQ-715, P1)  
**Sprint**: 387  
**Goal**: PR CI 4 shards GREEN이지만 master push CI run #25652638875 shard 1+3 FAILURE인 6 spec/line 정밀 fix

---

## 문제 분석 (4축)

### 1. reuseExistingServer 동작
- CI: `reuseExistingServer: false` (PR/master push 동일) → 차이 없음

### 2. webServer array timing race
- web(3000) + api(3001) 병렬 시작. Vite lazy route 첫 번째 navigate 시 cold 컴파일(1~5초) 발생
- `ax-bd/bmc`, `roadmap` 모두 `lazy: () => import(...)` — 첫 번째 접근 시 Vite 컴파일 지연
- master push CI는 squash merge 후 별도 runner → pnpm cache miss 가능 → 빌드 더 느림

### 3. harness-kit prebuild 영향
- harness-kit build 완료 시점이 api dev-server 의존 → 시작 순서 race는 줄어들지만, Vite chunk 컴파일은 별도

### 4. Playwright retry 정책
- `retries: 2` (3 attempts). 타이밍 의존 fail은 3 attempts 모두 실패 가능

---

## 6 Failing Spec/Line (F651 PR CI: PASS → master push: FAIL)

| # | Spec 파일 | Test (line) | Failing Assertion (line) | 원인 |
|---|-----------|-------------|--------------------------|------|
| 1 | ax-bd-hub.spec.ts | BMC 목록 페이지 렌더링 (L42) | `main` visible timeout 10000ms (L48) | lazy route cold 컴파일 + `main` 10s timeout |
| 2 | discovery-detail-advanced.spec.ts | F440 기획서 생성 (L218) | `startBtn` visible timeout 5000ms (L257) | TemplateSelector 모달 애니메이션 CI 지연 |
| 3 | roadmap-changelog.spec.ts | Roadmap Phase 정보 (L21) | "Phase 37" visible timeout 10000ms (L41) | useEffect fetch → React re-render 10s 초과 가능 |

---

## Fix 계획

### Fix 1: ax-bd-hub.spec.ts BMC test (L42~49)
- **현재**: `await expect(page.locator("main")).toBeVisible({ timeout: 10000 })`
- **변경**: `waitForLoadState("domcontentloaded")` 추가 + timeout 10000→20000
- **근거**: lazy route cold 컴파일 후 `main` 렌더까지 CI에서 10s 초과 가능

### Fix 2: discovery-detail-advanced.spec.ts startBtn (L257)
- **현재**: `await expect(startBtn).toBeVisible({ timeout: 5000 })`
- **변경**: timeout 5000→15000
- **근거**: TemplateSelector 모달 애니메이션이 CI에서 5s 초과

### Fix 3: roadmap-changelog.spec.ts Phase 37 (L41)
- **현재**: `await expect(page.getByText("Phase 37").first()).toBeVisible({ timeout: 10000 })`
- **변경**: timeout 10000→20000
- **근거**: waitForResponse 이후 React useEffect→setState→re-render 사이클이 CI에서 10s 초과 가능

---

## DoD

- P-a: 6 fail spec/line 정확 매핑 reports 작성
- P-b: PR CI vs master push CI 환경 차이 분석 4축 결과
- P-c: 3 spec 정밀 fix (timeout 보강 + waitForLoadState)
- P-d: typecheck PASS
- P-e: 회귀 0건 (기존 통과 spec 영향 없음)
- P-f: PR CI 4 shard GREEN
- P-g: master push CI 4 shard GREEN
- P-h: dual_ai_reviews INSERT ≥ 1건
- P-i: 5/14 D-3 dry-run 이전 완결
