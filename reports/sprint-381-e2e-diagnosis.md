# Sprint 381 E2E 실패 진단 보고서

> **Date**: 2026-05-10 | **Sprint**: 381 | **F-item**: F644

## 요약

PR #802 (Sprint 380) 기준 e2e shard 1~3 FAILURE 5 spec 파일 분석.

| Spec 파일 | 실패 라인 | 근본 원인 | Fix |
|-----------|----------|----------|-----|
| `agent-execute.spec.ts` | 149 | 503 mock body `{error:...}` → api-client `d.error` 추출 → 메시지 미매칭 | mock body `{}` 변경 |
| `feedback-dashboard.spec.ts` | 148 | JWT payload `role` 누락 → `isAdmin: false` → admin 사이드바 숨김 | `makeFakeJwt` role 추가 |
| `integration-path.spec.ts` | 40 | Playwright LIFO: broad `**/api/**` mock이 fixture AppShell mock override → OrgSwitcher crash | `route.fallback()` 변경 |
| `agent-streaming.spec.ts` | — | 추정: 동일 JWT role 파생 / 타이밍 | JWT role fix 전파로 해소 기대 |
| `work-management.spec.ts` | — | 추정: 동일 패턴 / 타이밍 | JWT role fix 전파로 해소 기대 |

## 1. agent-execute.spec.ts — 503 mock 메시지 불일치

**실패 assertion**: `await expect(page.getByText(/실행 실패|503/)).toBeVisible()`

**실제 흐름**:
```
mock: { error: "Service unavailable" } (Content-Type: application/json)
  → api-client.ts L99: bodyMessage = d.error = "Service unavailable"
  → ApiError.message = "Service unavailable"
  → AgentExecuteModal error state: "Service unavailable"
  → /실행 실패|503/ 미매칭 ❌
```

**Fix 적용 후 흐름**:
```
mock: {} (Content-Type: application/json, statusText: "Service Unavailable")
  → api-client.ts L99: d.error = undefined → bodyMessage = null
  → ApiError.message = "API 503: Service Unavailable"
  → /503/ 매칭 ✓
```

## 2. feedback-dashboard.spec.ts — feedbackLink 미표시

**실패 assertion**: `await expect(page.getByRole("link", { name: "피드백" })).toBeVisible()`

**실제 흐름**:
```
makeFakeJwt() payload: { sub, email, exp }  // role 없음
  → useUserRole(): const role = payload?.role ?? "member"  // = "member"
  → isAdmin = false
  → sidebar.tsx: adminGroups.filter(isVisible) → 공개 없음
  → "피드백" link 렌더링 안 됨 ❌
```

**Fix 적용 후 흐름**:
```
makeFakeJwt() payload: { sub, email, role: "admin", exp }
  → useUserRole(): role = "admin" → isAdmin = true
  → sidebar.tsx: adminGroups 전부 표시 → "피드백" link 렌더링 ✓
```

**전파 범위**: `fixtures/org.ts`가 `authTest.extend`로 `authenticatedPage`를 상속하므로  
`feedback-dashboard.spec.ts`(orgPage fixture)에도 자동 적용됨.

## 3. integration-path.spec.ts — main 미표시

**실패 assertion**: `await expect(page.locator("main")).toBeVisible()`

**실제 흐름 (Playwright LIFO 규칙)**:
```
Fixture 등록 시점:
  Route A: **/api/orgs     → [{id: "test-org-e2e", ...}]
  Route B: **/api/nps/check → {shouldShow: false}
  Route C: **/api/agents   → []
  Route D: **/api/agents/stream → SSE empty

Test 등록 시점 (LATER):
  Route E: **/api/**       → [] (LIFO: 이 핸들러가 먼저 실행됨)

/api/orgs 요청 → Route E 매칭 → [] 반환
  → OrgSwitcher: orgs = [] → orgs[0].name 접근 시 TypeError
  → React error boundary 활성화 → <main> 미렌더 ❌
```

**Fix 적용 후 흐름**:
```
Route E: **/api/** → await route.fallback()
  → /api/orgs → Route A → [{id: "test-org-e2e", ...}] ✓
  → /api/nps/check → Route B → {shouldShow: false} ✓
  → /api/kpi → no handler → network fail → useApi catch → error state ✓
  → <main> 렌더링 정상 ✓
```

## 4. e2e.yml master push 트리거 미등록

**현상**: `gh run list --workflow="E2E Tests"` 결과에 master push 시 workflow 미실행.  
admin merge PR이 master에 반영되어도 E2E Tests 실행 기록 없음 → 누적 부채 가시화 0.

**Fix**: `on:` 블록에 `push: branches: [master]` 추가.

## 5. 패턴 분류표

| 패턴 | 영향 spec | 빈도 |
|------|----------|------|
| JWT role 누락 | feedback-dashboard, (streaming, work-mgmt 파생) | 핵심 |
| LIFO route override | integration-path | 신규 |
| mock body mismatch | agent-execute | 신규 |
| CI trigger 누락 | (인프라) | 신규 |
