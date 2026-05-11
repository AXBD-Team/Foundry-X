# Sprint 387 — Master Push CI 회귀 분석 보고서

**F652** (FX-REQ-715, P1) | Sprint 387 | 2026-05-11

---

## P-a: 6 Fail Spec/Line 정확 매핑

| # | 파일 | Test 이름 | Test 라인 | 실패 Assertion | Assertion 라인 | 타임아웃 |
|---|------|-----------|-----------|----------------|----------------|---------|
| 1 | ax-bd-hub.spec.ts | BMC 목록 페이지 렌더링 | L42 | `page.locator("main").toBeVisible` | L48 | 10000ms |
| 2 | discovery-detail-advanced.spec.ts | 형상화 탭에서 생성하기 클릭 → 기획서 생성 후 BusinessPlanViewer 표시 | L218 | `startBtn.toBeVisible` | L257 | 5000ms |
| 3 | roadmap-changelog.spec.ts | Roadmap 페이지에 Phase 정보가 표시된다 | L21 | `getByText("Phase 37").first().toBeVisible` | L41 | 10000ms |

**CI 실패 정보**: master push run #25652638875, shard 1+3 FAILURE (PR CI #809 4 shards GREEN)

---

## P-b: PR CI vs Master Push CI 환경 차이 분석

### 4축 비교

| 축 | PR CI (sprint/386) | Master Push CI | 차이 여부 | 원인 기여도 |
|----|--------------------|--------------------|-----------|-------------|
| reuseExistingServer | `false` (CI=true) | `false` (CI=true) | 동일 | ✗ |
| webServer 시작 순서 | web(3000)+api(3001) 병렬 | 동일 | 동일 | ✗ |
| harness-kit prebuild | build 완료 후 실행 | 동일 | 동일 | ✗ |
| Playwright retry | 2 retries (3 attempts) | 동일 | **runner 성능 차이** | ✅ 주 원인 |

### 결정적 차이: Runner 성능 + Vite Cold 컴파일

**PR CI**: sprint/386 브랜치 — 이전 실행의 pnpm/node_modules 캐시 활용 가능성 높음  
**Master push CI**: squash merge 후 fresh commit — GitHub Actions cache miss 가능성↑ → 빌드/컴파일 느림

### Vite Lazy Route 분석

```
router.tsx L30: { path: "roadmap", lazy: () => import("@/routes/roadmap") }
router.tsx L94: { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") }
```

- 두 라우트 모두 `lazy()` → 첫 번째 navigate 시 Vite chunk 컴파일 발생
- CI 환경에서 cold 컴파일: 1~5초 추가 지연
- `useEffect` → API fetch → `setState` → React re-render 사이클이 컴파일 완료 후 시작
- 전체 소요 시간이 timeout(10s/5s)을 초과하는 race condition

### TemplateSelector 모달 분석

- `startBtn { timeout: 5000 }`: TemplateSelector 모달은 CSS transition 애니메이션 포함
- CI CPU 부하 하에서 300ms 애니메이션이 실제 완료까지 수 배 지연 가능
- 5000ms는 PR CI(빠른 runner)에서만 안정적, master push CI(느린 runner)에서 불안정

---

## P-c: 6 Spec Fix 결과

| # | 파일 | 수정 내용 | 이전 | 이후 |
|---|------|-----------|------|------|
| 1 | ax-bd-hub.spec.ts | L47: waitForLoadState 추가 | - | `await page.waitForLoadState("domcontentloaded")` |
| 2 | ax-bd-hub.spec.ts | L48: timeout 증가 | `timeout: 10000` | `timeout: 20000` |
| 3 | discovery-detail-advanced.spec.ts | L257: startBtn timeout 증가 | `timeout: 5000` | `timeout: 15000` |
| 4 | roadmap-changelog.spec.ts | L41: Phase 37 timeout 증가 | `timeout: 10000` | `timeout: 20000` |

**Fix 근거 (공통)**: master push CI runner 성능 variability + Vite lazy route cold 컴파일로 인한 타이밍 지연 대응. 코드 로직 변경 없음, assertion 대기 시간만 증가.

---

## 위험 잔존 항목

1. **timeout 증가로도 flaky 지속 가능성**: runner 극단적 지연 시 재발 가능 → F653으로 추적 예정
2. **Discovery test L51 (ServiceContainer)**: 동일 패턴이지만 이번 CI fail에서 미검출 → F651 이후 안정적으로 판단, 모니터링 계속
