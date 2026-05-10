# Sprint 382 E2E Content Drift 진단 보고서

> **Date**: 2026-05-10 | **Sprint**: 382 | **F-item**: F646

## 요약

F644 PR #803 MERGED 후 shard 1+2에서 잔존하는 4개 E2E spec 실패를 정밀 진단하여 root cause와 fix를 도출했다.

## 진단 결과

### FAIL #1: ax-bd-hub.spec.ts:18 — `getByText("아이디어 목록")`

| 항목 | 내용 |
|------|------|
| **URL** | `/shaping/proposal` |
| **현재 라우트** | `packages/web/src/routes/ax-bd/index.tsx` (사업기획서 목록) |
| **"아이디어 목록" 위치** | `IdeaDetailPage.tsx:83` back link만 존재 (본 페이지 무관) |
| **Root cause** | 페이지 리팩토링: AX BD 허브 레이아웃 → 사업기획서 목록 전용 |
| **Fix** | `**/api/biz-items` mock → empty items → `"등록된 아이템이 없어요."` assertion |

### FAIL #2+3: conflict-resolution.spec.ts:57+64 — `getByText("에이전트 토큰 사용량 차트")` 30s timeout

| 항목 | 내용 |
|------|------|
| **URL** | `/shaping/prd` |
| **현재 라우트** | `packages/web/src/routes/shaping-prd.tsx` (PRD 관리 목록) |
| **Textarea/Spec 생성 위치** | `packages/web/src/routes/spec-generator.tsx` at `/shaping/spec-generator` |
| **Root cause** | 라우트 분리: `/shaping/prd` = PRD 목록, `/shaping/spec-generator` = Spec 생성기 |
| **Fix** | 3개 test의 `page.goto("/shaping/prd")` → `page.goto("/shaping/spec-generator")` |

라우터 확인:
```
{ path: "shaping/prd", lazy: () => import("@/routes/shaping-prd") }       // PRD 관리 목록
{ path: "shaping/spec-generator", lazy: () => import("@/routes/spec-generator") }  // Spec 생성기
```

### FAIL #4: feedback-dashboard.spec.ts:148 — `feedbackLink.toBeVisible()` 실패

| 항목 | 내용 |
|------|------|
| **URL** | `/feedback-dashboard` |
| **사이드바 링크** | `sidebar.json > adminGroups > admin-portal > { href: "/feedback-dashboard", label: "피드백" }` |
| **가시성 조건** | `isAdmin = true` + `openGroups.has("admin-portal") = true` |
| **Root cause** | `useGroupState` 초기 state에 `admin-portal` 미포함 + auto-expand useEffect 타이밍 불확실 (React StrictMode) |
| **Fix** | `page.goto()` 전 `localStorage.setItem("fx-sidebar-groups", [..., "admin-portal"])` |

#### 기술 상세

```typescript
// useGroupState 초기 state (admin-portal 미포함)
() => new Set(["discover", "shape", "validate", "productize"])

// admin 그룹은 adminGroups 배열로 visibility: "admin" 자동 적용
// auto-expand useEffect: [pathname] 의존 + openGroups stale closure
// React StrictMode double-mount에서 assertion보다 re-render 늦을 수 있음
```

## Fix 적용 후 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/web/e2e/ax-bd-hub.spec.ts` | line 12-19: biz-items mock + empty state assertion |
| `packages/web/e2e/conflict-resolution.spec.ts` | line 46, 77, 115: URL 변경 `/shaping/prd` → `/shaping/spec-generator` |
| `packages/web/e2e/feedback-dashboard.spec.ts` | line 143-148: localStorage fx-sidebar-groups 사전 설정 |

## fs 실측 증거

```bash
# "아이디어 목록" 텍스트 존재 위치
grep -rn "아이디어 목록" packages/web/src/
# → IdeaDetailPage.tsx:83 back link만 (shaping/proposal 페이지와 무관)

# /shaping/proposal 현재 라우트 컴포넌트
# → packages/web/src/routes/ax-bd/index.tsx (사업기획서 목록)

# Spec 생성기 (Textarea + "Spec 생성" 버튼)
# → packages/web/src/routes/spec-generator.tsx at /shaping/spec-generator

# feedback-dashboard sidebar item
# → sidebar.json adminGroups > admin-portal > { href: "/feedback-dashboard", label: "피드백" }
```

## typecheck 검증

- pre-existing 에러: `shared/src/discovery-contract.ts:21` (우리 변경 전부터 존재)
- 우리 변경으로 인한 새 TS 에러: **0건**
- lint: PASS (pending 상태)
