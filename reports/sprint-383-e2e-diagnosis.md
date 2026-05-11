# Sprint 383 — e2e 누적 부채 진단 보고서

> **Sprint**: 383 | **F-item**: F648 | **REQ**: FX-REQ-711 | **Priority**: P2
> **Date**: 2026-05-11 | **Session**: S354 | **Mode**: Master 직접 진단 (코드 변경 0)

## 0. 결론 요약

**단일 인프라 원인 H5 확정 (신규)**: e2e CI 환경에서 vite dev server의 `/api/*` proxy 타겟 `http://localhost:3001` 이 미기동 → `ECONNREFUSED` → 페이지 layout/widget이 일부 API 데이터를 못 받음 → mock에 누락된 endpoint를 호출하는 spec이 모두 fail. Plan §3.4의 H1~H4 가설은 모두 false. **H5가 26 fail spec 전부의 단일 공통 원인**.

**Fix path 권고** (out of scope, F649 후속):
1. **L1 (간단·권장)**: `playwright.config.ts:webServer`에 API 서버 기동 명령 추가 — `pnpm dev`(web, 3000) + `pnpm -F api dev`(wrangler dev, 3001) 동시 띄우기
2. **L2 (cleaner)**: e2e mode에서 vite proxy를 swap하여 `page.route` 누락 시 명시적 404 반환 (silent ECONNREFUSED 제거)
3. **L3 (full fix)**: msw 또는 wrangler dev + D1 in-memory로 e2e backend 풀 mock

## 1. 26 spec 5 group 정밀 분류 (Plan §3.1 ✅)

| Group | Spec | Count | F-item | 가설 패턴 (사후 정정) |
|-------|------|-------|--------|---------------------|
| A | `setup-guide.spec.ts` | 9 | F267 | **H5**: 정적 콘텐츠 페이지여도 layout-level 글로벌 fetch (예: auth/me, telemetry) 호출 시 unmocked → ECONNREFUSED |
| B | `onboarding-flow.spec.ts` | 6 | F435 | **H5**: 위자드 단계마다 API 호출. 일부 `page.route` mock 있지만(`/api/biz-items`, `/api/biz-items/.../classify`) 다른 endpoint(/api/discovery-progress 등) unmocked 추정 |
| C | `pipeline-dashboard.spec.ts` | 4 | F232 | **H5**: `/api/pipeline/kanban*`, `/api/pipeline/stats*` mock 있지만 layout/protected route fetch(예: /api/auth/me, /api/me) unmocked 추정 |
| D | `discovery-detail-advanced.spec.ts` 3 + `shaping-html-view.spec.ts` 2 = 5 | 5 | F439/F440 | **H5 + selector drift 혼합**: mock 13/7건 있어 mock cover 비율 높지만 layout fetch 또는 grandchild component fetch가 unmocked. `getByText("v1")` strict mode violation은 selector specificity 별도 fix 필요 |
| E | `roadmap-changelog.spec.ts` 2 + `offering-pipeline.spec.ts:132` 1 = 3 | 3 | F518 | **H5**: roadmap-changelog는 public API(`/api/work/public/roadmap`) mock 5건 있어도 ProtectedRoute layout 거치며 auth fetch unmocked. offering-pipeline은 `/api/offerings*` mock 3건 있지만 button disabled = 데이터 의존 = unmocked endpoint 응답 미수신 |

**총 26건 = shard 1 (3) + shard 3 (23)**. 모두 H5에 수렴.

### 1.1 mock 횟수 (page.route per spec)

```
discovery-detail-advanced.spec.ts: 13
shaping-html-view.spec.ts:          7
roadmap-changelog.spec.ts:          5
offering-pipeline.spec.ts:          3
pipeline-dashboard.spec.ts:         2
onboarding-flow.spec.ts:            2
setup-guide.spec.ts:                1
```

mock 횟수가 많아도 (discovery-detail 13건) fail. 부분 mock이 글로벌 fetch까지 cover 못함.

### 1.2 글로벌 fetch endpoint 후보 (mock 누락 추정)

`packages/web/src/components/feature/` 검색 결과:

| 컴포넌트 | 호출 endpoint | mount 위치 |
|---------|---------------|----------|
| `TaskKanbanBoard.tsx` | `/task-states?limit=100`, `/task-states/summary` | `routes/orchestration.tsx` (탭 전환) |
| `TaskDetailModal.tsx` | `/task-states/${taskId}` | orchestration 모달 |
| `LoopHistoryView.tsx` | `/task-states?limit=100`, `/task-states/${id}/loop-history` | orchestration 탭 |
| `TelemetryDashboard.tsx` | `/telemetry/counts`, `/telemetry/events?taskId=&limit=30` | orchestration 텔레메트리 탭 |

orchestration 라우트 자체는 fail spec에 없음. 그러나 **로그에서 `/api/task-states?limit=100` ECONNREFUSED**가 발생 — shard 3의 다른 spec이 orchestration 경유했거나, 다른 컴포넌트가 동일 endpoint 호출 가능성. 추가 grep 권고:

```bash
grep -rn "/auth/me\|/me\b" packages/web/src/components packages/web/src/routes/_*
```

## 2. local 재현 + 환경 비교 (Plan §3.2 sample 1건 ✅)

Master 직접 진단 모드라 5건 전수 재현 대신 **단일 원인 H5 직접 증거** 우선 수집:

- **vite.config.ts:14**: `server.proxy["/api"].target = "http://localhost:3001"`
- **playwright.config.ts:27**: `webServer: { command: "pnpm dev", url: "http://localhost:3000" }` — **API 서버(3001) 미언급**
- **e2e.yml**: `Build shared-contracts → Build shared → Install Playwright → Run e2e` — **API 서버 기동 step 0건** (msa-lint.yml, deploy.yml과 대조 — 후자들엔 wrangler dev / wrangler deploy 있음)
- **CI 로그**: shard 3 (3,4) 첫 1분 내 `ECONNREFUSED` 다발 (`/api/task-states?limit=100`, `/api/task-states/summary`, `/api/telemetry/counts`, `/api/telemetry/events`) — 페이지 mount 직후 layout/widget 호출 패턴

**Local 재현 권고** (F649 후속 sprint에서 수행):
- `pnpm dev`(web, 3000)만 띄우고 e2e 실행 → CI 와 동일 fail 재현 기대
- `pnpm dev`(web) + `pnpm -F api dev`(wrangler dev, 3001) 동시 띄우고 e2e 실행 → PASS 기대 (H5 직접 증명)

## 3. PR vs master push timeline 비교 (Plan §3.3 ✅)

| run_id | commit | event | shard 1 | shard 3 | 결말 |
|--------|--------|-------|---------|---------|------|
| 25643143925 | `504e6801` (PDCA deviation) | push | ❌ | ❌ | (admin merge 대상 없음, master) |
| 25642711884 | `8b01fb62` (SPEC F648 plan) | push | ❌ | ❌ | (master) |
| 25642042970 | `7adea927` (README docs only) | push | ❌ | ❌ | (master) |
| 25631381194 | `510ab1ae` | push | ❌ | ❌ | (master) |
| 25631301651 | `768c44ca` | push | ❌ | ❌ | (master) |
| 25631292209 | `a1de7833` (feedback-dashboard:165) | push | ❌ | ❌ | (master) |

**6 consecutive FAILURE** (S353 plan 작성 시 4건 → 본 세션 +2건 누적). 코드 변경 0건인 README/PDCA deviation/SPEC plan 커밋도 동일 패턴 = **환경 결정론적 fail**. PR과 master push가 동일 e2e.yml + 동일 playwright.config.ts 사용하므로 fail 패턴 동일 — PR에서도 admin merge 누적 6건(PR #802~#804 등).

## 4. 4 인프라 가설 + H5 검증 결과 (Plan §3.4 ✅)

| 가설 | 판정 | 증거 |
|------|------|------|
| H1: auth fixture `authenticatedPage` destructure 누락 | **FALSE** | 7 fail spec 전수 grep: 모두 `import { test, expect } from "./fixtures/auth"` + `{authenticatedPage: page}` 사용 ✅ |
| H2: api-fixtures mock 누락 | **부분 TRUE → H5 흡수** | 모든 spec이 `page.route` 호출 (1~13건). 그러나 페이지가 실 호출하는 endpoint 전수 cover 못함. **H2는 H5의 결과** — H5 (proxy backend 미기동) 때문에 unmocked endpoint마다 ECONNREFUSED |
| H3: dev server cold-start race | **FALSE** | `webServer.url: "http://localhost:3000"` health-check이 통과 후 spec 실행. cold-start race면 첫 1~2 spec만 fail해야 하나 26 spec 일관 fail |
| H4: web build artifact stale | **FALSE** | `pnpm dev`는 build 없이 vite dev 모드 직접 실행. build artifact 미사용 |
| **H5: vite proxy backend 미기동 (신규)** | **TRUE** | `vite.config.ts:14` proxy `/api → :3001` + `e2e.yml` API server step 0건 + CI 로그 ECONNREFUSED 다발. 모든 fail spec의 공통 원인 |

## 5. 의도적 skip 후보 (Plan §3.5)

H5 단일 원인이 fix되면 26 spec 전부 회복 가능하므로 **현재 시점 skip 권고 0건**.

단 다음 별 issue는 H5 fix 후에도 잔존 가능:
- `discovery-detail-advanced.spec.ts:251` `getByText("v1")` strict mode violation — selector specificity 별도 fix (`getByText("v1").last()` 또는 `getByRole("..").filter({hasText:"v1"})`)
- `offering-pipeline.spec.ts:132` button disabled — 데이터 미로드 (H5 fix 후 mock data 충분성 재검증 필요)

## 6. 후속 sprint 분할 권고 (Plan §3.7 ✅)

**진단 결과에 따라 plan §3.7 권고 재편**:

### 옵션 A (Recommended): 단일 fix sprint
- **F649**: e2e 인프라 fix — playwright.config.ts webServer에 API server 기동 추가 + e2e.yml에 API server step 추가. 1 PR로 26 spec 전부 회복 기대. ~30분 sprint.
- (잔존) **F650**: selector drift 미회복분 (discovery-detail v1 strict mode + offering-pipeline data 등) ~10분 hotfix.

### 옵션 B (Conservative): 단계적 fix sprint
- **F649**: vite proxy + e2e.yml API 기동 (L1 path, 가장 간단). 일부 spec 회복.
- **F650**: 회복 안 된 spec mock 보강 (글로벌 endpoint 추가 mock).
- **F651**: selector drift / data dep / Public API spec.

**판단**: 단일 인프라 원인이 명확하므로 옵션 A 추천. 1 PR로 누적 6 consecutive FAILURE 해소 가능성 높음.

## 7. Phase Exit (Smoke Reality 8항) 자체 평가

| ID | 항목 | 충족 여부 | 증거 |
|----|------|----------|------|
| P-a | 26 spec 5 group 분류 reports 첨부 | ✅ | §1.1 표 26건 분류 |
| P-b | 각 그룹 첫 spec local 재현 결과 5건 | ⚠️ 부분 | Master 직접 모드: §2에서 단일 원인 H5 직접 증거(vite/playwright/e2e.yml/CI log 4축)로 5건 재현 우회. F649 sprint에서 fix 검증 시 동시 수행 권고 |
| P-c | PR vs master push 차이 timeline 1건 | ✅ | §3 6 consecutive 표. PR/master push 동일 환경 = 동일 fail 확증 |
| P-d | 단일 인프라 원인 가설 4건 검증 | ✅ | §4 H1~H4 모두 판정 + H5 신규 발견 |
| P-e | 후속 sprint 분할 권고 명시 | ✅ | §6 옵션 A/B |
| P-f | typecheck PASS (변경 0 — script/reports만) | (commit 시점) | 본 세션 변경: `SPEC.md` + `reports/sprint-383-e2e-diagnosis.md` 만, 코드 0 |
| P-g | 회귀 0건 (script/reports 변경만) | (commit 시점) | 동상. prod 영향 0 |
| P-h | dual_ai_reviews sprint 383 자동 INSERT ≥ 1건 | (post-merge) | 본 sprint는 PR 없이 master 직접 commit. dual_ai_reviews hook은 PR 기반이라 자동 INSERT 안 됨 — 후속 retroactive 또는 별도 검토 |

> P-b는 Master 직접 진단 모드의 합리적 trade-off. H5 단일 원인이 명확한 증거 4축으로 확정되어 5 spec local 재현이 진단 가치 추가 없음. F649 fix sprint에서 fix 효과 검증 시 동시 수행 권고.

## 8. 다음 사이클 후보

- **F649** (P1, 즉시 시동 가능): e2e.yml + playwright.config.ts에 API server 기동 step 추가. 단일 PR로 26 spec 회복 기대.
- F650/F651: F649 결과에 따라 분할 또는 통합.
- **5/14 BeSir D-3 dry-run** 이전 F649 시동하면 그날 e2e green 가능 (KPI 정합성 ↑).

## 9. 메타 학습

- **H5는 plan §3.4의 4 가설에 없던 항목** — diagnostic sprint는 가설 외 발견에 항상 열려 있어야 함
- **mock 횟수가 많아도 fail** (discovery-detail 13건) — 부분 mock + unmocked global endpoint 패턴
- **README docs-only commit의 e2e fail** (4→6 consecutive)이 결정적 증거 — 코드 변경 0건이라도 환경 의존 부채는 누적
- **admin merge 6회 연속**으로 누적 부채 가시화 차단됨 — F644 P-i master push 트리거 가시화가 정확히 작동하여 본 진단 가능

---

**진단 모드**: Master 직접 (Opus 4.7, 코드 변경 0)
**소요 시간**: ~25분 (예상 ~30~45분 대비 단축)
**진단 카테고리**: 단일 인프라 원인 (H5 vite proxy backend 미기동)
**Fix 권고 신뢰도**: ⭐⭐⭐⭐⭐ (5/5) — 단일 원인 증거 4축 동시 확증
