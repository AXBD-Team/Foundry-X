# Sprint 386 — F651 e2e 잔존 9 test 정밀 fix

**Sprint**: 386  
**F-item**: F651  
**FX-REQ**: FX-REQ-712  
**Priority**: P2  
**Scope**: LOCKED — `packages/web/e2e/*.spec.ts` 만 수정

## 목표

F650 (Sprint 385) 에서 `.skip` 처리된 9개 e2e test의 실제 근본 원인을 진단·수정하고 `.skip` 해제한다.

## 9 test 근본 원인 분석

| # | 파일 | 근본 원인 | 수정 |
|---|------|-----------|------|
| 1 | discovery-detail-advanced:152 | (a) `기준 완료` → 컴포넌트는 `기준 충족` 렌더, (b) `분석 시작` 버튼 없음(per-stage `실행` 버튼만 존재), (c) getGraphSessions mock 미등록 | regex 수정 + button assertion 제거 + mock 추가 |
| 2 | discovery-detail-advanced:214 | TemplateSelector 모달이 열리는데 `기획서 생성 시작` 클릭 단계 누락 + export mock 미등록 | 클릭 단계 추가 + export mock 추가 + assertion을 `v1` 뱃지로 변경 |
| 3 | discovery-detail-advanced:256 | `aria-label="사업기획서 재생성"` → accessible name이 `재생성` exact 불일치 | `{ name: /재생성/ }` 로 regex 전환 |
| 4 | discovery-item-list:104 | `getByText("대기")` strict mode — 필터 버튼 + 뱃지 2 elements | `.first()` 추가 |
| 5 | roadmap-changelog:22 | mock 응답 수신 전 assertion 시도 → `waitForResponse` 대기 필요 | `waitForResponse` 추가 |
| 6 | roadmap-changelog:105 | `page.evaluate` 이전 `page.goto()` 없음 → `window.location.origin = "null"` → invalid URL | `page.goto("/roadmap")` 선행 |
| 7 | offering-pipeline:134 | 조기 skip (assertion은 항상 성립) | `.skip` 제거만 |
| 8 | shaping-html-view:71 | `bp-iframe-item-1` testid 없음 — 컴포넌트는 Sheet + `bp-sheet-iframe` 패턴 | `bp-full-view-item-1` 클릭 → `bp-sheet-iframe` 검증으로 재작성 |
| 9 | shaping-html-view:85 | 동일 (describe.skip 내) | Sheet Escape 닫기로 재작성 |

## DoD

- P-a: 9개 test 모두 `.skip` 해제
- P-b: typecheck PASS (e2e spec은 `.ts`, tsc --noEmit 범위)
- P-c: CI 4 shards GREEN (E2E)
- P-d: 기존 passing tests 회귀 없음
- P-e: SPEC.md F651 상태 `✅` 갱신
