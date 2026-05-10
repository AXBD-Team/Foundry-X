# Sprint 381 Design — F644 E2E selector/fixture 누적 부채 fix

> **Sprint**: 381 | **F-item**: F644 | **REQ**: FX-REQ-709 | **Priority**: P2
> **Date**: 2026-05-10 | **Session**: S352

## 1. 목표 요약

5개 failing E2E spec 파일의 근본 원인을 수정하고, master push에 E2E workflow 트리거를 추가한다.

## 2. 근본 원인 분석

### 2.1 feedback-dashboard.spec.ts E-08 (feedbackLink 미표시)

**Root cause**: `auth.ts`의 `makeFakeJwt()`가 JWT payload에 `role` 필드를 생략함.
- `useUserRole` hook은 JWT payload에서 `role`을 읽음
- `role` 없음 → 기본값 `"member"` → `isAdmin: false`
- `sidebar.tsx`의 admin 그룹 (피드백 링크 포함) 숨김

**Fix**: `makeFakeJwt()` payload에 `role: "admin"` 추가

### 2.2 agent-execute.spec.ts line 149 (실행 실패|503 미표시)

**Root cause**: 503 mock body `{ error: "Service unavailable" }` 전달 시:
- `api-client.ts`가 `d.error` 필드를 bodyMessage로 추출
- `ApiError.message = "Service unavailable"` → `/실행 실패|503/` 미매칭

**Fix**: mock body를 `{}` 으로 변경 → bodyMessage null → fallback `"API 503: Service Unavailable"` → `/503/` 매칭

### 2.3 integration-path.spec.ts line 40 (main 미표시)

**Root cause**: Playwright LIFO route ordering 위반.
- 테스트가 `**/api/**` broad mock을 fixture 등록 이후에 추가
- LIFO: 마지막 등록된 핸들러가 먼저 실행 → broad mock이 fixture의 specific 핸들러를 override
- `OrgSwitcher`가 `[]` 응답을 받아 React render crash → error boundary 활성화 → `<main>` 미렌더
- Comment: "Without these, OrgSwitcher / NpsSurveyTrigger / agents cause React render crashes"

**Fix**: `route.fulfill({body: "[]"})` → `await route.fallback()` 로 변경
- broad handler가 fixture specific 핸들러로 위임
- `/api/kpi`, `/api/pipeline/stats` 등 dashboard-specific은 network error → `useApi` graceful catch

### 2.4 agent-streaming.spec.ts / work-management.spec.ts

**Root cause (추정)**: S313 확인 결과 fixture destructure 이미 정상. `isAdmin` 관련 없음.
- `agent-streaming.spec.ts`: SSE 처리 로직 정상 (AgentStreamDashboard.tsx 검증 완료)
- `work-management.spec.ts`: specific mock setup 완비, route 존재 확인

**판단**: 추가 수정 없음. JWT role fix(2.1)로 파생 문제 해소 가능성 있음.

### 2.5 e2e.yml master push 미트리거

**Root cause**: `.github/workflows/e2e.yml`이 `pull_request` 트리거만 있고 `push: branches: [master]` 없음.

**Fix**: `on:` 블록에 `push: branches: [master]` 추가

## 3. 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `packages/web/e2e/fixtures/auth.ts` | `makeFakeJwt()` payload에 `role: "admin"` 추가 |
| `packages/web/e2e/agent-execute.spec.ts` | 503 mock body `{ error: "..." }` → `{}` |
| `packages/web/e2e/integration-path.spec.ts` | broad mock `route.fulfill(...)` → `await route.fallback()` |
| `.github/workflows/e2e.yml` | `push: branches: [master]` 추가 |
| `reports/sprint-381-e2e-diagnosis.md` | 진단 보고서 |

## 4. 테스트 계약 (TDD — 면제 대상: E2E spec fix)

E2E spec 자체 수정은 TDD Red Phase 면제 (`.claude/rules/tdd-workflow.md` §면제: P0 Hotfix / test fix).

## 5. 파일 매핑

| Worker | 파일 | 작업 |
|--------|------|------|
| W1 | `packages/web/e2e/fixtures/auth.ts` | L9-16 payload에 `role: "admin"` 추가 |
| W2 | `packages/web/e2e/agent-execute.spec.ts` | L135 body 변경 |
| W3 | `packages/web/e2e/integration-path.spec.ts` | L35-37 route handler 변경 |
| W4 | `.github/workflows/e2e.yml` | `push: branches: [master]` 추가 |

## 6. Phase Exit 체크리스트 (D1~D4)

| # | 항목 | 검증 |
|---|------|------|
| D1 | 주입 사이트 전수 확인 | JWT role 변경이 `feedback-dashboard`+`org`fixture 양쪽에 전파됨 (org extends auth) |
| D2 | 식별자 계약 | `role: "admin"` = `useUserRole` 기대 값 일치 |
| D3 | Breaking change | `auth.ts` 변경은 E2E test only, production JWT 무관 |
| D4 | TDD Red 면제 | E2E spec 수정은 면제 영역 |
