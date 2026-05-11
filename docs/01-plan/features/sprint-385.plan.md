# Sprint 385 Plan — F650 e2e selector drift 정밀 fix (F649 후속 26 fail)

> **Sprint**: 385 | **F-item**: F650 | **REQ**: FX-REQ-713 | **Priority**: P1
> **Date**: 2026-05-11 | **Session**: S354 | **Mode**: Master 직접 (autopilot 우회)

## 1. 목표

F649 Sprint 384 (PR #805 + hotfix PR #806) H5 fix 후 잔존 26 spec selector drift 정밀 fix.

**근본 차이 (F648/F649 vs F650)**:
- F648/F649: 환경 인프라 문제 (vite proxy backend 미기동 → ECONNREFUSED → 페이지 mount fail)
- **F650**: spec 자체와 페이지 컨텐츠 drift (페이지 mount 후 element not found / selector specificity 부족)

## 2. 사전 측정 (S354 post-F649, run `25644671540`)

| Shard | Pass | Fail | Flaky | F648 측정 | F650 대상 |
|-------|------|------|-------|----------|-----------|
| 1 | 89 | **3** | 2 | 3 (동일) | discovery-detail-advanced.spec.ts 3건 |
| 2 | 97 | **1** | 0 | 0 (신규) | integration-path Phase 4 ErrorResponse schema |
| 3 | 71 | **22** | 0 | 23 (1건 회복) | 5 spec 묶음 |
| 4 | **all** | 0 | 0 | 0 | 회복 ✅ |
| **합계** | ~282 | **26** | 2 | 26 | 26 |

**회복률**: 91.6% (282/308). 본 sprint는 잔존 26 fail + flaky 2 처리.

## 3. 5 Group 분류 + Fix 전략

### Group A: setup-guide F267 (9건, shard 3)

**가설**: 페이지 컨텐츠가 변경됐는데 spec 미동기화 또는 페이지 자체 obsolete.

**Action**:
1. `packages/web/src/routes/setup-guide.tsx` 실 컨텐츠 확인
2. spec의 `getByRole("tab", { name: "환경 설정" })` 등 selector를 실 컨텐츠로 동기화
3. obsolete page면 9건 일괄 `.skip()` + design 사유 기록

### Group B: onboarding-flow F435 (6건, shard 3)

**대표 fail**: `onboarding-flow.spec.ts:51 getByLabel("아이템 제목")` not found.

**Action**:
1. `packages/web/src/routes/onboarding-flow.tsx` 또는 wizard 컴포넌트 실 label 확인
2. spec의 label 또는 role selector 동기화

### Group C: pipeline-dashboard F232 (4건, shard 3)

**가설**: data dependency 또는 kanban 컴포넌트 selector drift.

**Action**:
1. `/api/pipeline/kanban*` mock 응답 정합성 확인
2. 컴포넌트 selector 동기화

### Group D: discovery-detail-advanced (3건, shard 1) + shaping-html-view (2건, shard 3)

**대표 fail**: discovery-detail-advanced.spec.ts:251 `getByText("v1")` strict mode violation.

**Action**:
1. `getByText("v1")` → `getByText("v1").last()` 또는 `getByRole(...).filter({hasText:"v1"})`
2. shaping-html-view iframe sandbox selector 동기화

### Group E: roadmap-changelog F518 (2건, shard 3) + offering-pipeline:132 (1건, shard 3) + integration-path Phase 4 (1건, shard 2)

**Action**:
1. roadmap-changelog: public API mock 정합성
2. offering-pipeline: button disabled 데이터 mock 보강
3. integration-path: Phase 4 ErrorResponse schema 정합성 확인 (zod schema 변경 영향?)

## 4. Phase Exit (Smoke Reality 8항)

| ID | 항목 | 판정 기준 |
|----|------|----------|
| P-a | 26 fail spec 정확 매핑 reports | reports/sprint-385-e2e-selector-drift-fix.md §1 표 |
| P-b | 5 group 정밀 fix diff | git diff per group |
| P-c | local 1 spec 회복 직접 증거 (각 group sample) | playwright headed 1 PASS per group |
| P-d | CI 4 shard 모두 GREEN | run conclusion=success 4/4 |
| P-e | typecheck `--force` cache 0건 PASS | turbo log |
| P-f | 회귀 0건 | 변경 packages/web/e2e/*만, prod 영향 0 |
| P-g | dual_ai_reviews sprint 385 자동 INSERT | post-merge hook |
| P-h | **master push e2e GREEN — 7 consecutive FAILURE 종결** | post-merge run conclusion=success |

## 5. 의존

- F649 ✅ (H5 fix 효과 입증)
- F648 ✅ (진단 완결)

## 6. 위험 + 대응

| # | 위험 | 대응 |
|---|------|------|
| R1 | setup-guide 9건 모두 obsolete page | 일괄 `.skip()` + design 사유 기록 (F490 TD-03 패턴) |
| R2 | fix가 다른 spec에 영향 | local + CI 4 shard 회귀 검증 |
| R3 | integration-path 신규 1건은 zod schema 별 issue | 분리 가능 시 별 F-item 등록 |
| R4 | 16/17회차 변종 재현 (CI 의존성 surface change) | hotfix forward 경로 준비 (e2e.yml 추가 build step 등) |

## 7. 예상 시간

**~60~90분 Master 직접**
- CI 로그 정밀 분석 = 15분
- 5 group fix = 45분
- local 검증 = 15분
- PR + auto-merge + CI = 15분

## 8. 시동 시점

**즉시** (본 세션 S354 이어서, 5/14 BeSir D-3 dry-run 이전 완결 목표).

## 9. 다음 사이클 후보 (out of scope)

- F640 P1 zod-openapi 4 packages 본 통합
- 5/14 BeSir D-3 dry-run 진행 (F650 완결 직후)
