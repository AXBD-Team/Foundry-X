# Sprint 382 Design — F646 E2E Content Drift Fix

> **Sprint**: 382 | **F-item**: F646 | **Session**: S352

## §1 목표

4개 failing E2E spec의 content drift 원인을 정밀 진단하고, 실 컴포넌트 fs 실측 기반으로 selector를 동기화한다.

## §2 진단 결과

### D1: ax-bd-hub.spec.ts:18 — `getByText("아이디어 목록")` 미존재

- **원인**: `/shaping/proposal` 라우트가 `packages/web/src/routes/ax-bd/index.tsx`로 변경됨
- **현재 페이지**: 사업기획서 목록 전용 페이지 (AX BD 허브 레이아웃 해체)
- **"아이디어 목록" 위치**: `IdeaDetailPage.tsx` back link에만 존재 (해당 페이지와 무관)
- **Fix**: `**/api/biz-items` mock + `"등록된 아이템이 없어요."` empty state assertion

### D2: conflict-resolution.spec.ts:57+64 — `getByText("에이전트 토큰 사용량 차트")` timeout

- **원인**: spec은 `/shaping/prd` URL 사용. 현재 라우터:
  - `/shaping/prd` → `shaping-prd.tsx` (PRD 관리 목록 페이지, Textarea/Spec 생성 없음)
  - `/shaping/spec-generator` → `spec-generator.tsx` (Textarea + "Spec 생성" 버튼 있음)
- **Fix**: 3개 `page.goto("/shaping/prd")` → `page.goto("/shaping/spec-generator")`

### D3: feedback-dashboard.spec.ts:148 — `feedbackLink.toBeVisible()` 실패

- **원인**: 사이드바 admin-portal 그룹 auto-expand 타이밍 불확실
  - `useGroupState` 초기 state: `new Set(["discover", "shape", "validate", "productize"])` (admin-portal 미포함)
  - auto-expand useEffect: `[pathname]` 의존 + `openGroups` stale closure
  - React StrictMode double-mount에서 re-render 타이밍이 assertion보다 늦을 수 있음
- **Fix**: `page.goto()` 전에 `localStorage.setItem("fx-sidebar-groups", [..., "admin-portal"])` 미리 설정

## §3 변경 파일

| # | 파일 | 변경 내용 |
|---|------|---------|
| (a) | `packages/web/e2e/ax-bd-hub.spec.ts` | line 12-18: biz-items mock 추가 + assertion "등록된 아이템이 없어요." |
| (b) | `packages/web/e2e/conflict-resolution.spec.ts` | line 46, 77, 115: URL `/shaping/prd` → `/shaping/spec-generator` |
| (c) | `packages/web/e2e/feedback-dashboard.spec.ts` | line 143-148: localStorage fx-sidebar-groups 사전 설정 |
| (d) | `reports/sprint-382-e2e-content-drift.md` | 진단 리포트 |

## §4 TDD 체크리스트

| # | 항목 | 검증 |
|---|------|------|
| D1 | `ax-bd/index.tsx` 에 "아이디어 목록" 링크 부재 fs 확인 | ✅ (grep 확인) |
| D2 | `spec-generator.tsx` 에 Textarea + "Spec 생성" 버튼 있음 | ✅ (코드 확인) |
| D3 | admin-portal 그룹이 `adminGroups` 배열 (visibility=admin 자동 적용) | ✅ (sidebar.tsx 확인) |
| D4 | `fx-sidebar-groups` localStorage 미리 설정 시 useEffect가 정확히 읽음 | ✅ (useGroupState 로직 확인) |
