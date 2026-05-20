---
code: FX-PLAN-411
title: Sprint 411 — F678 e2e 신규 부채 진단
version: 1.0
status: Active
category: PLAN
sprint: 411
f-item: F678
fx-req: FX-REQ-739
priority: P2
session: S371
date: 2026-05-20
---

# Sprint 411 — F678 e2e 신규 부채 진단

> F648 (Sprint 383 ✅ S354) 패턴 재현 — F651 GREEN 이후 약 9일 동안 누적된 4 신규 fail spec 원인 그룹화 + 후속 fix sprint 분할 권고.
> **scope LOCKED**: `docs/`+`reports/`만. 코드 변경 0. autopilot 오해 방지.

## 1. 목표

F651 (Sprint 386 ✅ S355) PR #809 MERGED 시점 e2e 4 shards GREEN 완결 → 약 9일 후 (S371, 2026-05-20) ac968b03 master push 결과 shard 1+2+3 fail 재발. 4 신규 fail spec의 정확한 원인을 진단하고 후속 fix sprint를 분할한다.

## 2. 사전 측정 (S371, 2026-05-20)

### 2.1 ac968b03 E2E run 26134782352 결과

| Shard | 결과 | 비고 |
|-------|:----:|------|
| 1/4 | ❌ failure | 2 fail |
| 2/4 | ❌ failure | 1 fail |
| 3/4 | ❌ failure | 2+ fail (다수) |
| 4/4 | ✅ success | |
| merge-reports | ✅ success | |

### 2.2 4 신규 fail spec 정확 식별

| # | Shard | Spec | Line | 첫 에러 | 도입 시점 |
|---|-------|------|------|---------|----------|
| 1 | 1/4 | `ax-bd-hub.spec.ts` | :42 (BMC 목록 페이지 렌더링) | element not found | 이전 존재 (추정) |
| 2 | 1/4 | `discovery-detail-advanced.spec.ts` | :218 (형상화 탭 → BusinessPlanViewer) | element not found | **F664** Sprint 398 (`a38258cf`) |
| 3 | 2/4 | `hitl-state-machine.spec.ts` | :111 (T2 POST `/api/hitl/transition` 200) | page.waitForRequest Test ended | **F664** Sprint 398 (`a38258cf`) |
| 4 | 3/4 | `operations.spec.ts` | :55+62 (4 org unit columns + selector changes) | element not found | **F621** Sprint (`9f435198`) |

### 2.3 commit timeline (F651 ↔ ac968b03 사이 e2e/ 변경)

```
6df628ab F651 MERGED (Sprint 386, S355 2026-05-11) — 50 sprint streak GREEN ✅
b2beb7c4 F652 Sprint 387 — master push CI 회귀 fix
709d37f7 F654 Sprint 389 — Class A/B/B' assertion timeout fix
61858564 F655 Sprint 390 — roadmap-changelog strict mode + dismissGuideModal click race
9f435198 F621 Sprint — operations.spec.ts 신규 (운영 통합 대시보드)  ← 신규 부채 #4
a38258cf F664 Sprint 398 — HITL Console UI (hitl-state-machine + discovery-detail-advanced:218)  ← 신규 부채 #2+#3
... (S360~S370 추가 commit)
ac968b03 S371 hotfix (CI scope rename) — 본 결과
```

### 2.4 첫 에러 패턴 다양성

- `element not found` 3건 (Group A/B/D) — selector drift 또는 페이지 mount 실패
- `page.waitForRequest Test ended` 1건 (Group C) — fixture destructure 또는 fetch 우회 (S313 Playwright fixture gotcha 패턴)

→ **단일 인프라 원인 아닐 가능성 높음** (F648 H5 webServer ECONNREFUSED 단일 원인과 다른 양상).

## 3. 범위 (Phase Exit P-a~P-h, 진단 전용 — 코드 변경 0)

### 3.1 4 spec 4 group 정밀 분류

| Group | Spec | 가설 |
|-------|------|------|
| **A** | ax-bd-hub.spec.ts:42 | 신규 페이지 fixture 미준비 또는 routing 변경. F664 BusinessPlanViewer 라우팅 우회 영향? |
| **B** | discovery-detail-advanced.spec.ts:218 | F664 BusinessPlanViewer mount race 또는 mock 미준비 (api/hitl mock 의존?) |
| **C** | hitl-state-machine.spec.ts:111 | F664 `page.waitForRequest` destructure issue (S313 Playwright fixture gotcha 재현). authenticatedPage fixture는 destructure 시만 실행, page.route는 page.request 미가로챔 패턴 |
| **D** | operations.spec.ts:55+62 | F621 4 org column data dep (API mock 미준비) 또는 selector drift |

### 3.2 각 그룹 local 재현 절차

```bash
# F649 webServer array 활용 (web + api 동시 기동)
cd packages/web
pnpm e2e --grep "ax-bd 허브 — BMC 목록"           # Group A
pnpm e2e --grep "BusinessPlanViewer 표시"          # Group B
pnpm e2e --grep "T2.*transition"                   # Group C
pnpm e2e --grep "4 org unit columns"               # Group D
```

각 spec PASS/FAIL + 원인 1줄 reports에 기록.

### 3.3 원인 가설 H1~H6 검증 (true/false + 증거)

| 가설 | 설명 | 검증 방법 |
|------|------|----------|
| **H1** | 신규 페이지 fixture 미준비 (Group A) | ax-bd-hub.spec.ts BMC 페이지 URL → `packages/web/src/routes/` 실 컴포넌트 존재? |
| **H2** | F664 BusinessPlanViewer mount race (Group B) | discovery-detail-advanced:218 "생성하기" 클릭 → 비동기 응답 대기 누락? |
| **H3** | page.waitForRequest fixture destructure issue (Group C, S313 패턴) | hitl-state-machine.spec.ts:111 authenticatedPage destructure ↔ page.waitForRequest 순서 |
| **H4** | F621 operations data dep mock 미준비 (Group D) | operations.spec.ts api-fixtures 4 org unit mock 존재? |
| **H5** | webServer array 회귀 (F649 fix 후 무관 가능) | playwright.config.ts `webServer: [web + api]` 정상 동작? |
| **H6** | API endpoint 변경 (proxy.ts harness-kit 의존 영향) | `proxy.ts:7 createStranglerMiddleware` 본 hotfix(ac968b03) 후 변경 ? |

### 3.4 reports/sprint-411-e2e-residual-diagnosis.md 작성

- Group 분류 + 첫 fail 재현 결과 + H1~H6 검증 결과 + 후속 sprint 권고
- F648 reports/sprint-383-e2e-diagnosis.md 형식 재현

### 3.5 후속 fix sprint 분할 권고

| 가칭 | 범위 | 예상 시간 |
|------|------|----------|
| **F679** | Group A+B+C fix (ax-bd-hub + discovery-detail-advanced + hitl-state-machine) | ~30~50분 |
| **F680** | Group D fix (operations 2 fail) | ~15~25분 |

진단 결과에 따라 통합 또는 재편 가능. **상위 P0 작업 (F677 v0.3.0)이 더 시급하면 본 진단 reports만 남기고 F679/F680는 deferred 가능**.

## 4. Phase Exit (Smoke Reality 8항)

| # | 항목 | 판정 |
|---|------|------|
| P-a | 4 spec 4 group 분류 reports/sprint-411-e2e-residual-diagnosis.md 작성 | 파일 존재 + Group A~D 섹션 |
| P-b | 각 그룹 local 재현 결과 (PASS/FAIL/원인) 4건 | 4 group × 1 spec 첫 fail 재현 |
| P-c | F664+F621 도입 시점 commit timeline 1건 | reports에 `git log` 기반 timeline |
| P-d | 원인 가설 H1~H6 검증 결과 (true/false + 증거) 6건 | 각 가설 PASS/FAIL + 1줄 근거 |
| P-e | 후속 sprint 분할 권고 명시 | F679/F680 (또는 통합) scope 정의 |
| P-f | typecheck PASS | 변경 0 (docs+reports만) |
| P-g | 회귀 0건 | script/reports 변경만, prod 영향 0 |
| P-h | dual_ai_reviews sprint 411 자동 INSERT ≥ 1건 | hook 75 sprint 연속 |

## 5. 의존

- F651 ✅ (Sprint 386, S355) — selector drift fix 완결
- F664 ✅ (Sprint 398, S362) — HITL Console UI 도입 (hitl-state-machine + discovery-detail-advanced:218)
- F621 ✅ (Sprint, S358 추정) — operations.spec.ts 도입

## 6. 위험 + 대응

| 위험 | 대응 |
|------|------|
| local 재현이 PASS면 환경 의존 원인 | F648 H5 유사 패턴 — 다른 service 미기동? CI vs local Node/Playwright 버전 차이 진단 |
| F664 spec 3건이 동일 root cause | 일괄 fix 가능 (F679 통합), 진단 결과에 통합 권고 |
| ax-bd-hub가 신규 페이지 (mount 실패) | obsolete .skip + design 사유 기록 (F650 패턴) |
| Master 직접 진단 시간 초과 | autopilot 전환 검토 (scope LOCKED prompt 유지 필수) |

## 7. 예상 시간

**~25~40분 진단** (Master 직접 모드 F648 S354 패턴 재현 권고):
- CI 로그 분석 + spec 위치 매핑: 5~10분
- 4 group local 재현: 10~15분
- H1~H6 가설 검증 + 증거 기록: 5~10분
- reports 작성 + 후속 sprint 권고: 5~10분

## 8. 다음 사이클 후보 (out of scope)

- F679/F680 fix sprint (본 진단 결과 따라)
- F677 v0.3.0 (Cache headers + Compression + D1 강제 membership lookup)
- GitHub Release tag 추가
- F647 sidebar Portal race / F645 silent layer 7 (다른 종)

## 9. 시동 방식 결정

본 sprint는 F648 S354 패턴(Master 직접 진단 모드)을 따른다:
- **이유**: scope LOCKED (`docs/`+`reports/`만) + 코드 변경 0 → autopilot이 코드 변경하려 시도할 위험. Master 직접 진단이 안전.
- **fallback**: Master 직접 진행 중 막히면 autopilot 전환 가능 (SCOPE LOCKED prompt 유지).
- F648 → S354 완결 시간 ~25분 → 본 진단도 유사 예상.
