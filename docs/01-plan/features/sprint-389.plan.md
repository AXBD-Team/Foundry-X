---
id: FX-PLAN-389
sprint: 389
feature: F654
req: FX-REQ-712
priority: P2
status: in_progress
created: 2026-05-12
---

# Sprint 389 Plan — F654 e2e master push CI Class A/B/B' timeout fix

## 목적

F653 진단(Sprint 388)에서 확정된 Class A/B/B' assertion 결함 6건을 수정하여
E2E CI shard failure 가중 요인을 제거한다.

주원인 (iv) Vite cold compile + CI transform cache 없음은 F655로 분리하되,
assertion timeout/strategy 강화로 CI 환경 슬로우 스타트 내성을 향상시킨다.

## F653 진단 요약

- **결정적 증거**: docs-only push (코드 변경 0건)에서도 E2E fail → Vite CI cache 부재가 주원인
- **가중 요인**: 아래 6 assertion이 CI 환경 지연에 취약한 timeout/strategy 사용

## 변경 범위 — 6 assertion / 4 spec file

| # | 파일 | 라인 | Class | 변경 내용 |
|---|------|------|-------|----------|
| 1 | ax-bd-hub.spec.ts | 55 | A | timeout 10000 → 30000 |
| 2 | ax-bd-hub.spec.ts | 47-48 | B' | waitForLoadState("domcontentloaded") → "networkidle" |
| 3 | discovery-detail-advanced.spec.ts | 257 | A | timeout 15000 → 30000 |
| 4 | discovery-detail-advanced.spec.ts | 261 | A | timeout 15000 → 30000 |
| 5 | offering-pipeline.spec.ts | 141-143 | B | toBeVisible() → toBeVisible({ timeout: 30000 }) |
| 6 | roadmap-changelog.spec.ts | 40 | B | toBeVisible({ timeout: 20000 }) → toBeVisible({ timeout: 30000 }) |

### Class 정의
- **Class A**: timeout 단순 증가 (10000/15000 → 30000)
- **Class B**: toBeVisible()에 명시적 timeout 추가
- **Class B'**: waitForLoadState strategy 강화 (domcontentloaded → networkidle)

## Out of Scope (절대 금지)

- Class C offering-pipeline:132+138 obsolete 검증 → F656
- Vite cache CI 최적화 → F655
- playwright.config.ts webServer array 변경
- 다른 spec timeout 조정
- 5/14 BeSir D-2 dry-run 작업, AI Foundry idea 시리즈
- zod-openapi 추가 변경, core/* 도메인 변경

## Phase Exit P-a~P-h

| # | 항목 | 기준 |
|---|------|------|
| P-a | 6 assertion 정확 fix diff | F653 §P-c 표 그대로 |
| P-b | 4 spec local 회복 직접 증거 | 각 1건 sample |
| P-c | typecheck PASS | 에러 0 |
| P-d | lint 회귀 0 | warning 증가 없음 |
| P-e | PR CI 4 shard GREEN | auto-merge |
| P-f | master push CI 4 shard GREEN | F644~F653 누적 부채 진정 종결 |
| P-g | dual_ai_reviews INSERT ≥ 1건 | hook 53 sprint 연속 |
| P-h | 5/14 D-2 buffer 내 완결 | 오늘 완결 |

## DoD

- 4 spec file 변경만 (packages/web/e2e/ 내)
- typecheck PASS (turbo cache 우회 포함)
- PR CI 4 shard GREEN → auto-merge
- master push CI GREEN 확인 (P-f)
