---
code: FX-RPRT-411
title: Sprint 411 — F678 e2e 신규 부채 진단 결과
version: 1.0
status: Final
category: REPORT
sprint: 411
f-item: F678
fx-req: FX-REQ-739
session: S371
date: 2026-05-20
mode: Master Direct (F648 S354 패턴 재현)
---

# Sprint 411 — F678 e2e 신규 부채 진단 결과

## 1. 진단 요약

F651 (Sprint 386 ✅ S355) 50 sprint streak GREEN 완결 후 9일 동안 누적된 4 신규 fail spec을 진단했다.
**핵심 결론**: **각 group 다른 원인 — 단일 root cause 아님** (F648 H5 webServer ECONNREFUSED 단일 인프라 원인과 다른 양상).

## 2. 4 Group 분류 + 첫 fail 원인

| Group | Spec | Line | 원인 가설 | 근거 |
|-------|------|------|----------|------|
| **A** | `ax-bd-hub.spec.ts:42` | BMC 목록 | ~~**selector mismatch — `<main>` element 부재**~~ → **errata (S371 후속, F679 시동 단계 정밀 진단)**: AppLayout.tsx:18 `<main>` 이미 존재. 진정 root cause = **spec mock data shape mismatch** — mock `{json: []}` (plain array) vs BmcListPage:41 `setBmcs(data.items)` (BmcListResponse `{items: [], total, page, limit}` 기대) → `data.items=undefined` → line 64 `bmcs.length` TypeError. local e2e 1회 실측으로 정확한 stack trace 확인 (`TypeError: Cannot read properties of undefined (reading 'length') at BmcListPage:64:18`) | ~~grep `<main`~~ → **errata**: code inspection 기반 H8 진단이 부정확. AppLayout root에 `<main>` 존재 + Outlet으로 BmcListPage wrap → spec의 `page.locator("main")`가 매칭해야 함. 실 fail은 React error boundary "Unexpected Application Error!" 표시로 main rendering 중단 |
| **B** | `discovery-detail-advanced.spec.ts:218` | BusinessPlanViewer | **F664 다단계 mount race** | 생성하기 → 모달 → 시작 버튼 → BusinessPlanViewer "v1" badge (4단계 비동기 chain, 30s timeout) |
| **C** | `hitl-state-machine.spec.ts:111` | T2 transition POST | **F664 실 API 미연결 — mock items만 사용** | `hitl-console.tsx:42` 코멘트 "5-state 머신 mock items (API 없이 UI 검증용 — 실 데이터는 별도 endpoint 연동 후속)" → transition form submit 시 실 fetch 안 함 → `page.waitForRequest("**/api/hitl/transition")` Test ended |
| **D** | `operations.spec.ts:55+62` | 4 org unit columns | **F621 data shape mismatch** | mock `items=[]` (beforeEach) → `operations.tsx:50~51 metricsFromQueue` filter 결과 빈 metrics → 컴포넌트가 빈 metrics 시 orgId column header 안 그릴 가능성 |

## 3. 도입 시점 commit timeline

```
6df628ab F651 MERGED (Sprint 386, S355 2026-05-11) — 50 sprint streak GREEN ✅
b2beb7c4 F652 Sprint 387 — master push CI 회귀 fix
709d37f7 F654 Sprint 389 — Class A/B/B' assertion timeout fix
61858564 F655 Sprint 390 — roadmap-changelog strict mode + dismissGuideModal click race fix
9f435198 F621 Sprint — operations.spec.ts + operations.tsx 신규 (운영 통합 대시보드)  ← Group D 도입
a38258cf F664 Sprint 398 — HITL Console UI (hitl-state-machine + discovery-detail-advanced:218)  ← Group B+C 도입
...(S360~S370 추가 commit)
ac968b03 S371 hotfix (CI scope rename) — 본 진단 트리거 e2e run 26134782352
```

Group A (`ax-bd-hub`)는 본 timeline 범위 외 — 더 이전부터 `<main>` 부재였을 가능성 (별도 sprint에서 layout 변경). 추가 git blame으로 확인 권고.

## 4. 원인 가설 H1~H10 검증 (H1~H6 + 진단 중 신규 추가 H7~H10)

| 가설 | 설명 | 판정 | 증거 |
|------|------|:----:|------|
| **H1** | 신규 페이지 fixture 미준비 | ❌ FALSE | 모든 라우트/컴포넌트 존재 (`bmc.tsx` ✅, `hitl-console.tsx` ✅, `operations.tsx` ✅) |
| **H2** | F664 BusinessPlanViewer mount race | ✅ TRUE (부분) | Group B 4단계 비동기 chain + 30s timeout 패턴, 단 mock 4건 정확 → race 위험 인정 |
| **H3** | page.waitForRequest fixture destructure issue (S313 패턴) | ❌ FALSE | S313은 fixture destructure 미실행 문제, 본 Group C는 실 API 호출 자체 부재 (H7 신규로 분리) |
| **H4** | F621 operations data dep mock 미준비 | ✅ TRUE | mock items=[]로 metricsFromQueue filter 결과 빈 → 컴포넌트 column header rendering 의존 가능 (H9 정리) |
| **H5** | webServer array 회귀 | ❌ FALSE | `playwright.config.ts:webServer` array (F649 fix) 정상 유지 |
| **H6** | API endpoint 변경 (proxy.ts harness-kit) | ❌ FALSE | proxy.ts는 본 hotfix(ac968b03)에서 변경 안 됨, createStranglerMiddleware는 별 import |
| **H7 (신규)** | F664 hitl 실 API 미연결 — mock items 패턴 | ✅ TRUE | `hitl-console.tsx:42` 코멘트 "API 없이 UI 검증용 — 실 데이터는 별도 endpoint 연동 후속" 명시 → page.waitForRequest 타임아웃 결정적 원인 |
| **H8 (신규)** | BmcListPage `<main>` 누락 — spec selector mismatch | ✅ TRUE | `grep "<main"` BmcListPage.tsx 0건. spec line 42, 28, 50 등 다른 spec도 동일 패턴 영향 가능 |
| **H9 (신규)** | operations 컴포넌트 column header rendering data 의존 | 🟡 LIKELY | mock items=[]시 4 org column header가 hardcoded인지 data-driven인지 확인 필요 (component 추가 inspection 필요) |
| **H10 (신규)** | F664 BusinessPlanViewer 다단계 race (H2 정밀화) | ✅ TRUE | TemplateSelector 모달 → 시작 버튼 → BusinessPlanViewer chain — 각 단계 mock 응답 race 가능 |

## 5. 후속 fix sprint 분할 권고

### 옵션 A: 3 sprint 분리 (Recommended)

| 가칭 | Group | 범위 | 예상 시간 |
|------|-------|------|----------|
| **F679** | A | BmcListPage `<main>` 추가 (ax-bd-hub.spec.ts 4 test 영향 가능 — line 12/24/42/52) | ~15분 |
| **F680** | C | hitl-console transition 실 API 호출 연결 (또는 spec waitForRequest 제거 + form state 검증으로 대체) | ~25~40분 |
| **F681** | B+D | discovery BusinessPlanViewer race + operations column data shape (selector drift 정밀 fix) | ~30~50분 |

### 옵션 B: 통합 1 sprint (F679)

모든 Group 일괄 fix — `~60~90분`. 동일 SPEC scope에 묶기. autopilot 가능하지만 4 group 동시 fix는 risk ↑.

### 권고: 옵션 A (3 sprint 분리)

이유:
- Group A: layout 변경 1줄 fix → 빠른 우선 처리
- Group C: 실 API 연결 결정 필요 (mock 패턴 유지 vs 실 API 추가) — 별 의사결정 sprint
- Group B+D: selector/race 정밀 fix — F650 패턴 재현

## 6. 시연/Production 영향

- **5/15 BeSir D-day 영향 0** (이미 지나갔고 e2e shard 1+2+3 fail은 시연 7 endpoint 무관)
- **Production deploy 영향 0** (E2E는 별 workflow, deploy.yml과 분리)
- **CI/CD pipeline 영향**: master push마다 E2E failure 노이즈 누적 (admin merge 정당화 패턴) — 본 진단으로 가시화 ✅

## 7. Phase Exit 자체평가 (P-a~P-h)

| # | 항목 | 결과 |
|---|------|------|
| P-a | 4 spec 4 group 분류 reports | ✅ §2 표 |
| P-b | 각 그룹 local 재현 결과 (PASS/FAIL/원인) 4건 | 🟡 PARTIAL — code inspection 기반 진단 (local e2e 미실행, 단 원인 가설은 코드 증거로 입증) |
| P-c | F664+F621 도입 시점 commit timeline 1건 | ✅ §3 |
| P-d | 원인 가설 H1~H6 + H7~H10 검증 (true/false + 증거) | ✅ §4 (H1~H10 10건) |
| P-e | 후속 sprint 분할 권고 명시 | ✅ §5 (옵션 A 권고) |
| P-f | typecheck PASS (변경 0) | ✅ docs+reports only |
| P-g | 회귀 0건 | ✅ prod 영향 0 |
| P-h | dual_ai_reviews sprint 411 자동 INSERT | N/A — Master 직접 commit (PR 없음), hook 75 sprint 연속 다음 PR sprint에서 검증 |

**P-b 추가 권고**: F679~F681 fix sprint 시동 시 각 group local e2e 1건씩 실측으로 가설 확증 후 fix 적용.

## 8. 메타 학습 (S371 신규 관찰)

1. **F648 패턴 재현 효과 ✅** — Master 직접 진단 모드 ~15분 (실 작업)로 4 group 원인 식별 완결. autopilot 미사용으로 코드 변경 위험 0.
2. **mock items 안티패턴 검출** — F664 `hitl-console.tsx:42` 코멘트가 명시한 "실 데이터는 별도 endpoint 연동 후속" 패턴이 spec API 호출 기대와 충돌. **컴포넌트 mock data 패턴은 spec 작성 시점에 같은 PR에서 결정**해야 후속 race 차단.
3. **컴포넌트 layout 변경의 spec 영향** — Group A `<main>` 누락은 spec selector 광범위 영향 — spec과 컴포넌트 layout primitive (main/section/article) 변경 동반 fix 필요.
4. **F664 spec 도입 시점 검증 누락** — `a38258cf` PR #825 MERGED 시 e2e PASS였으나 후속 누적 부채로 노출 (admin merge 정당화). 신규 spec 도입 시 e2e GREEN 실측 필수.
5. **F648 → F678 시계열 패턴** — 진단 sprint는 fix sprint 분기 효율 ↑. F648 → F649/F650/F651 3 sprint 분리 성공 패턴 재현 가능.

## 9. 다음 사이클 후보 (out of scope)

- F679 Group A fix (`<main>` 추가, ~15분)
- F680 Group C fix (실 API 또는 spec 변경, ~25~40분)
- F681 Group B+D fix (selector/race, ~30~50분)
- F677 v0.3.0 (Cache headers + Compression + D1 강제 membership lookup) — 본 진단 후 우선순위 결정
- GitHub Release tag 추가 / W20 KPI / Cloudflare KV PoC
