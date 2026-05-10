# Sprint 383 Plan — F648 e2e 누적 부채 진단 (shard 1+3 26 spec)

> **Sprint**: 383 | **F-item**: F648 | **REQ**: FX-REQ-711 | **Priority**: P2
> **Date**: 2026-05-11 | **Session**: S353

## 1. 목표

F644 Sprint 381 P-i (master push CI 트리거 가시화) ✅ 작동 후 **새 부채 노출**:
master push e2e 4 연속 FAILURE (PR 컨텍스트에서도 동일 fail, 직전 PR들이 admin merge로 통과시킴 누적).

본 sprint = **진단 전용** (fix 아님). 26 spec 누적 fail을 원인별로 그룹화하고 단일 인프라 원인 가설을 검증하여, 후속 fix sprint(F649/F650/F651)를 정확히 분할하기 위한 토대 자료 작성.

## 2. 사전 측정 (S353, 2026-05-11)

### 2.1 4 master push runs 분석

| run_id | commit | shard 1 | shard 2 | shard 3 | shard 4 |
|--------|--------|---------|---------|---------|---------|
| 25642042970 | `7adea927` (README docs only) | ❌ fail | ✅ pass | ❌ fail | ✅ pass |
| 25631381194 | `510ab1ae` (SPEC F646 ✅) | ❌ fail | ✅ pass | ❌ fail | ✅ pass |
| 25631301651 | `768c44ca` (SPEC F646 잔존) | ❌ fail | ✅ pass | ❌ fail | ✅ pass |
| 25631292209 | `a1de7833` (feedback-dashboard:165 fix) | ❌ fail | ✅ pass | ❌ fail | ✅ pass |

**결정적 증거**: README docs only `7adea927` (코드 변경 0건)도 e2e FAILURE = 환경/누적 부채 의존, 코드 변경 무관.

### 2.2 PR 컨텍스트에서도 동일 패턴

| PR | F-item | shard 1 | shard 2 | shard 3 | shard 4 | 결말 |
|----|--------|---------|---------|---------|---------|------|
| #803 | F644 | ❌ | ❌ (1건 F646 대상) | ❌ | ✅ | admin merge |
| #804 | F646 | ❌ | ❌ (1건) | ❌ | ✅ | admin merge |

= PR/master push 동일 환경 (`playwright.config.ts` baseURL `localhost:3000` + `pnpm dev`, 분기 없음). 결과 동일.

### 2.3 shard 1 fail spec (3건, master push 컨텍스트)

| Spec | Line | Failing | F-item |
|------|------|---------|--------|
| `discovery-detail-advanced.spec.ts` | 150 | F439 발굴분석 탭 분석 스텝퍼 + 9기준 체크리스트 표시 | F439 |
| `discovery-detail-advanced.spec.ts` | 210 | F440 형상화 탭 기획서 생성 후 BusinessPlanViewer 표시 — `getByText(/AI 문서 자동화 사업기획서/).first()` not visible | F440 |
| `discovery-detail-advanced.spec.ts` | 251 | F440 기획서 있는 경우 BusinessPlanViewer 바로 표시 — `getByText("v1")` **strict mode violation** (2 elements: badge + viewer) | F440 |

### 2.4 shard 3 fail spec (23건)

| Group | Spec | Count | F-item | 패턴 가설 |
|-------|------|-------|--------|----------|
| A | `setup-guide.spec.ts` | 9 | F267 | 정적 콘텐츠 페이지. mock 불필요한데도 fail = **routing/auth 가설** (가장 광범위, 단일 원인 의심) |
| B | `onboarding-flow.spec.ts` | 6 | F435 | 위자드 multi-step (Step 1→2→3). mock 필요 |
| C | `pipeline-dashboard.spec.ts` | 4 | F232 | data dependency (kanban data). API mock 시도 패턴 |
| D | `shaping-html-view.spec.ts` | 2 | — | iframe HTML 표시 (sandbox 패턴) |
| E | `roadmap-changelog.spec.ts` | 2 | F518 | Public API (인증 없이 접근) |
| F | `offering-pipeline.spec.ts:132` | 1 | — | `getByRole('button', /다음/)` **disabled** 56× retry timeout = 데이터 미로드 / API 미응답 |

### 2.5 첫 에러 패턴 다양성

- "element is not enabled" (offering-pipeline): 버튼 disabled state, data dependency
- "strict mode violation" (discovery-detail v1 뱃지): selector specificity 부족
- "not visible 10000ms timeout" (대다수): 페이지/컴포넌트 미렌더
- "30000ms timeout" (conflict-resolution): full timeout, 페이지 자체 미진입 가능

= **단일 인프라 원인 아닐 가능성 ↑**. 그러나 setup-guide 9건이 한꺼번에 죽는 건 단일 routing/auth/build 원인 의심.

### 2.6 e2e.yml/playwright.config.ts 환경 분석

- `e2e.yml`: 단순 — checkout → install → build shared-contracts+shared → playwright install → run e2e
- **API server 빌드 없음** (Workers, D1 mock 없음)
- `playwright.config.ts`: `baseURL: "http://localhost:3000"`, `webServer: pnpm dev`, retries=2, workers=1
- = master push와 PR 동일 환경. dev server + chromium만 사용. prod API hitting 없음

## 3. 범위 (Phase Exit P-a~P-h, 진단 전용 — 코드 변경 0)

### 3.1 26 spec 5 group 정밀 분류

- Group A: `setup-guide.spec.ts` 9 (F267, 정적 페이지) — **routing/auth 단일 원인 가설**
- Group B: `onboarding-flow.spec.ts` 6 (F435, 위자드)
- Group C: `pipeline-dashboard.spec.ts` 4 (F232, data dep)
- Group D: `discovery-detail-advanced.spec.ts` 3 (F439/F440) + `shaping-html-view.spec.ts` 2 = 5 (selector/iframe)
- Group E: `roadmap-changelog.spec.ts` 2 (F518) + `offering-pipeline.spec.ts:132` 1 = 3 (public/data)

총 26건 = shard 1 (3) + shard 3 (23).

### 3.2 각 그룹 첫 spec local 재현

```bash
cd packages/web
pnpm dev &  # localhost:3000
pnpm exec playwright test --grep "F267 설치 가이드" --headed  # Group A 첫 spec
pnpm exec playwright test --grep "F435.*3단계" --headed       # Group B
pnpm exec playwright test --grep "F232.*칸반"   --headed       # Group C
pnpm exec playwright test --grep "F439.*발굴분석" --headed     # Group D
pnpm exec playwright test --grep "F518.*Roadmap" --headed     # Group E
```

- local PASS면 → CI 환경 의존 원인 확정 (Node/Playwright version, dev server timing, build artifact)
- local FAIL면 → 코드/spec 자체 bug (selector drift, mock 누락, page 변경)

### 3.3 PR vs master push 차이 timeline 비교

`gh run list --workflow=e2e.yml --branch sprint/N` 직전 10 PR의 동일 spec fail/pass 변동 → admin merge 누적 시점 식별.

### 3.4 단일 인프라 원인 4 가설 검증

| 가설 | 검증 방법 | PASS 증거 | FAIL 증거 |
|------|----------|----------|----------|
| H1: auth fixture `authenticatedPage` destructure 누락 | 26 spec 헤더 grep `{authenticatedPage:page}` 검색 | 모두 사용 | 일부 사용 안 함 |
| H2: api-fixtures mock 누락 | 26 spec 헤더 mock setup 검색 | mock 설정 있음 | 누락 |
| H3: dev server cold-start race | `webServer.timeout` config 확인 + 첫 spec wait 패턴 | wait 적정 | wait 부재 |
| H4: web build artifact stale | `pnpm -F @foundry-x/web build` 후 e2e 재실행 | build 후 PASS | build 후도 FAIL |

### 3.5 의도적 skip 후보 식별

- setup-guide 9건이 모두 obsolete page (F267 설치 가이드가 더 이상 사용 안 되는 페이지)면 .skip 적용 권고
- TD-03 / F490 timeout/skip 누적 부채와 연결 가능 항목 표식

### 3.6 reports/sprint-383-e2e-diagnosis.md 작성

진단 결과 종합:
1. 26 spec 5 group 분류 표
2. 각 그룹 local 재현 결과 (PASS/FAIL)
3. PR vs master push 차이 결론
4. 4 가설 검증 결과
5. 후속 sprint 분할 권고

### 3.7 후속 sprint 분할 권고

예상 분할 (진단 결과에 따라 재편):
- **F649** Group A+B+C (Routing/Auth 단일 원인이면 19~21건 일괄, 다중 원인이면 분할)
- **F650** Group D (selector specificity 5건 — `getByText("v1")` 등 명확 selector drift)
- **F651** Group E + offering-pipeline (Public + data dep 3건)

## 4. Phase Exit (Smoke Reality 8항)

| ID | 항목 | 판정 기준 |
|----|------|----------|
| P-a | 26 spec 5 group 분류 reports 첨부 | `reports/sprint-383-e2e-diagnosis.md` §1 표 |
| P-b | 각 그룹 첫 spec local 재현 결과 5건 | §2 PASS/FAIL/원인 명시 |
| P-c | PR vs master push 차이 timeline 1건 | §3 admin merge 누적 시점 |
| P-d | 단일 인프라 원인 4 가설 검증 결과 | §4 H1~H4 true/false + 증거 |
| P-e | 후속 sprint 분할 권고 명시 | §5 F649/F650/F651 또는 재편 |
| P-f | typecheck PASS (변경 0 — script/reports만) | `pnpm typecheck` 19/19 |
| P-g | 회귀 0건 (script/reports 변경만, prod 영향 0) | git diff stat = `docs/`, `reports/`만 |
| P-h | dual_ai_reviews sprint 383 자동 INSERT ≥ 1건 | hook 48 sprint 연속 |

## 5. 의존

- F644 ✅ (master push 트리거 가시화 작동)
- F646 ✅ (4 spec content drift fix 완료)
- 외부 의존 없음 (CI/CD 영향 0, prod 영향 0)

## 6. 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | local 재현 PASS면 환경 의존 원인 확정 — CI vs local 차이 추가 진단 필요 | CI runner Node v20.x / Playwright version / dev server timing 추가 측정 |
| R2 | shard 별 fail이 random flakiness면 retry 정책 강화 검토 | 현재 retries:2 → retries:3 검토, 또는 fail-fast:false 유지 |
| R3 | setup-guide 9건 모두 obsolete면 .skip 일괄 적용 권고 | F267 페이지 존재 여부 + 사용자 트래픽 검증 후 design 사유 기록 |
| R4 | autopilot이 fix sprint로 오해하고 spec 수정 시도 | scope LOCKED: 진단 전용 (`reports/` + `docs/` 변경만, `packages/web/e2e/*` 수정 금지) |

## 7. 예상 시간

~30~45분 진단 (수동 또는 autopilot)
- local 재현 5 spec × 1분 = 5분
- 가설 검증 4건 × 5분 = 20분
- reports 작성 = 15분
- typecheck/회귀 확인 = 5분

## 8. 시동 시점

**다음 세션 또는 5/14 dry-run 이후**. 현 세션은 SPEC §5 등록 + Plan 작성 + push까지만.

## 9. 다음 사이클 후보 (out of scope)

- F649 / F650 / F651 fix sprint (F648 진단 결과 기반)
- 5/14 dry-run 사전 점검 (D-3, AI Foundry W19)
- 5/15 BeSir 미팅 진행 (D-4)
- F645 silent layer 7 fix (content-sync escape pipe 잔존)
- F647 sidebar Portal race condition 정밀 진단 (F646 잔존, admin-portal localStorage)
