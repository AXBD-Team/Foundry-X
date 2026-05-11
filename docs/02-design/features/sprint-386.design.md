# Sprint 386 Design — F651 e2e 잔존 9 test 정밀 fix

**Sprint**: 386 | **F-item**: F651 | **Scope**: e2e spec files only

## §1 변경 파일 매핑

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| `packages/web/e2e/discovery-detail-advanced.spec.ts` | modify | setupDetailMocks에 getGraphSessions + export mock 추가; test 1/2/3 skip 해제 + 수정 |
| `packages/web/e2e/discovery-item-list.spec.ts` | modify | test 4 skip 해제 + `.first()` 추가 |
| `packages/web/e2e/roadmap-changelog.spec.ts` | modify | test 5 waitForResponse + test 6 goto 추가 + skip 해제 |
| `packages/web/e2e/offering-pipeline.spec.ts` | modify | test 7 skip 해제만 |
| `packages/web/e2e/shaping-html-view.spec.ts` | modify | describe.skip → describe + test 8/9 재작성 |

## §2 각 수정 상세

### discovery-detail-advanced.spec.ts

**setupDetailMocks 추가**:
```typescript
page.route("**/api/biz-items/biz-1/discovery-graph/sessions", (route) =>
  route.fulfill({ json: { sessions: [] } }),
),
page.route("**/api/biz-items/biz-1/business-plan/export*", (route) =>
  route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<html><body><h1>AI 문서 자동화 사업기획서</h1></body></html>",
  }),
),
```

**Test 1**: regex `기준 완료` → `기준 충족`; `분석 시작` button assertion 제거

**Test 2**: "생성하기" 클릭 후 TemplateSelector "기획서 생성 시작" 클릭 추가;
assertion `getByText(/AI 문서 자동화 사업기획서/).first()` → `getByText("v1").first()`

**Test 3**: `getByRole("button", { name: "재생성" })` → `{ name: /재생성/ }`

### shaping-html-view.spec.ts

**Test 8** (iframe 표시) 재작성:
- `bp-card-item-1` click → `bp-full-view-item-1` click
- `bp-iframe-item-1` → `bp-sheet-iframe`
- 내용 검증은 `iframe.contentFrame()` 패턴 유지

**Test 9** (닫기) 재작성:
- 전체 보기 열기 → `bp-sheet-iframe` 확인 → Escape로 Sheet 닫기 → not.toBeVisible
