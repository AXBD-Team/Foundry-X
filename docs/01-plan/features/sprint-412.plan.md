---
code: FX-PLAN-412
title: Sprint 412 — F679 e2e Group A fix
version: 1.0
status: Active
category: PLAN
sprint: 412
f-item: F679
fx-req: FX-REQ-740
priority: P2
session: S371
date: 2026-05-20
---

# Sprint 412 — F679 e2e Group A fix

> F678 (Sprint 411 ✅ S371) 진단 H8 errata. local e2e 1회 실측으로 진정 root cause 확정. 2 lines change.
> **mode**: Master 직접 fix + PR branch + auto-merge

## 1. 목표

F678 Group A (`ax-bd-hub.spec.ts:42` BMC 목록 페이지) e2e fail 회복.
F678 진단 H8 ("BmcListPage `<main>` 부재 selector mismatch")는 부정확 — `AppLayout.tsx:18`에 `<main>` 이미 존재. 진정 root cause는 spec mock data shape mismatch.

## 2. 사전 측정 (S371, 2026-05-20)

### 2.1 local e2e 실측 결과

```bash
cd packages/web && pnpm e2e --grep "BMC 목록" --reporter=list
```

결과: 1 test failed (3 attempts), 모두 동일 에러.

**Error context (`test-results/.../error-context.md`)**:
```
TypeError: Cannot read properties of undefined (reading 'length')
at BmcListPage (BmcListPage.tsx:64:18)
```

→ Unexpected Application Error 발생 → React error boundary mount → `<main>` rendering 중단 → `page.locator("main")` timeout.

### 2.2 코드 진단

**`BmcListPage.tsx:35~50`**:
```typescript
const [bmcs, setBmcs] = useState<Bmc[]>([]);
const data = await fetchApi<BmcListResponse>("/ax-bd/bmc");
setBmcs(data.items);  // ← data.items=undefined 시 bmcs=undefined
```

**`BmcListResponse` type (line 27)**:
```typescript
interface BmcListResponse {
  items: Bmc[];
  total: number;
  page: number;
  limit: number;
}
```

**`ax-bd-hub.spec.ts:43` mock**:
```typescript
await page.route("**/api/ax-bd/bmc*", (route) =>
  route.fulfill({ json: [] }),    // ← plain array 반환
);
```

→ mock response가 plain array `[]`. 컴포넌트는 `{items: []}` 기대. `data.items=undefined` → `bmcs=undefined` → line 64 `bmcs.length` TypeError.

### 2.3 ax-bd-hub.spec.ts 4 test mock vs 컴포넌트 expected shape 대조

| Test | Mock | Expected | 정합? |
|------|------|----------|-------|
| 1 (`/shaping/proposal`) | `{items: []}` | shaping page | ✅ |
| 2 (`/ax-bd/ideas`) | `{items: [...], total, page, limit}` | `IdeaListResponse` ✅ | ✅ |
| **3 (`/ax-bd/bmc`)** | **`[]` plain** | **`BmcListResponse {items, total, page, limit}`** | **❌ mismatch** |
| 4 (`/discovery/items`) | mock 0건 | iframe 기반 ServiceContainer | mock 불필요 |

Test 3만 fix 필요.

## 3. 범위 (2 lines change)

### 3.1 spec mock shape fix

`packages/web/e2e/ax-bd-hub.spec.ts:43`:

```typescript
// Before
await page.route("**/api/ax-bd/bmc*", (route) =>
  route.fulfill({ json: [] }),
);

// After
await page.route("**/api/ax-bd/bmc*", (route) =>
  route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20 } }),
);
```

### 3.2 BmcListPage defensive code

`packages/web/src/components/feature/ax-bd/BmcListPage.tsx:41`:

```typescript
// Before
setBmcs(data.items);

// After
setBmcs(data.items ?? []);
```

이유: fixture race / mock response shape mismatch 강건성. 다른 BmcListPage 호출자 영향 0 (응답 shape 안 변경).

## 4. Phase Exit (P-a~P-f)

| # | 항목 | 판정 |
|---|------|------|
| P-a | spec mock shape `{items, total, page, limit}` 4 field | grep 검증 |
| P-b | BmcListPage defensive `?? []` | grep 검증 |
| P-c | local `pnpm e2e --grep "BMC 목록"` PASS | retry 0 (1번째 attempt PASS) |
| P-d | typecheck PASS | `pnpm typecheck` 회귀 0 |
| P-e | e2e shard 1 회복 (CI run에서 ax-bd-hub.spec.ts 3 test 모두 GREEN — test 1/2/4 회귀 0) | PR CI |
| P-f | dual_ai_reviews sprint 412 자동 INSERT ≥ 1건 | hook 76 sprint 연속 |

## 5. 의존

- F678 ✅ (Sprint 411, S371) — 진단 완결 + H8 errata
- F649 ✅ (Sprint 384, S354) — playwright webServer array (web + api 동시 기동, F664 BusinessPlanViewer mock 의존도 무관)

## 6. 위험 + 대응

| 위험 | 대응 |
|------|------|
| defensive `?? []`가 다른 BmcListPage 호출 영향 | 응답 shape 안 변경 (input contract만) → 영향 0 |
| e2e shard 1 다른 spec 영향 | mock pattern `**/api/ax-bd/bmc*` unique, 다른 spec 무영향 |
| PR CI 다른 shard 회귀 | PR auto-merge 전 4 shard 모두 점검, shard 2/3 fail 잔존(F680/F681 deferred)은 본 PR scope 외 |

## 7. 예상 시간

- fix 적용: ~2분
- local e2e 검증: ~2분
- PR 생성 + auto-merge: ~1분
- CI 검증 (4 shards): ~5분
- 총: **~10분**

## 8. 다음 사이클 후보 (out of scope)

- F680 Group C fix (hitl 실 API 연결 or spec 변경)
- F681 Group B+D fix (BusinessPlanViewer race + operations data shape)
- F677 v0.3.0 (Cache headers + Compression + D1 강제 membership lookup)
- W20 KPI 6/8 베이스라인

## 9. 메타 학습 후보 (S371 신규)

- **F678 진단 부정확 검출 패턴** — code inspection 기반 진단의 한계 노출. local e2e 1회 실측으로 진정 root cause 확정 (~3분 추가 비용).
- **mock data shape mismatch** — spec 작성 시점에 컴포넌트 type contract 정확 일치 의무화. defensive code는 안전망이지만 spec/컴포넌트 contract 정합이 우선.
