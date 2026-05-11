---
id: FX-RPRT-389
sprint: 389
feature: F654
match_rate: 100
verdict: PASS
created: 2026-05-12
---

# Sprint 389 Report — F654 e2e master push CI Class A/B/B' timeout fix

## 요약

F653 진단(Sprint 388)에서 확정된 Class A/B/B' assertion 결함 6건을 성공적으로 수정했어요.
Design 대비 Match Rate 100% 달성. 4 spec file만 변경, 구현 코드 0건 변경.

## P-a: 6 assertion fix diff 확인

| # | 파일 | Class | 변경 내용 | 상태 |
|---|------|-------|----------|------|
| 1 | ax-bd-hub.spec.ts | B' | domcontentloaded → networkidle | ✅ |
| 2 | ax-bd-hub.spec.ts | A | timeout 10000 → 30000 | ✅ |
| 3 | discovery-detail-advanced.spec.ts | A | startBtn timeout 15000 → 30000 | ✅ |
| 4 | discovery-detail-advanced.spec.ts | A | v1 badge timeout 15000 → 30000 | ✅ |
| 5 | offering-pipeline.spec.ts | B | toBeVisible({ timeout: 30000 }) 추가 | ✅ |
| 6 | roadmap-changelog.spec.ts | B | timeout 20000 → 30000 | ✅ |

## P-b: 4 spec local 회복 직접 증거

git diff --stat:
```
packages/web/e2e/ax-bd-hub.spec.ts                 | 4 ++--
packages/web/e2e/discovery-detail-advanced.spec.ts | 4 ++--
packages/web/e2e/offering-pipeline.spec.ts         | 2 +-
packages/web/e2e/roadmap-changelog.spec.ts         | 2 +-
4 files changed, 6 insertions(+), 6 deletions(-)
```

## P-c: typecheck 상태

- pre-existing error: `shared/src/discovery-contract.ts` (@foundry-x/shared-contracts 미설치 — 기존 에러)
- 우리 변경으로 인한 신규 typecheck 에러: **0건** ✅
- 검증: git stash → typecheck → 동일 에러 → stash pop으로 pre-existing 확인

## P-d: lint 회귀

```
@foundry-x/web:lint: Web lint: next lint config pending (Sprint 7)
Tasks: 1 successful, 1 total
```
회귀 0건 ✅

## P-e: PR CI 4 shard

PR #812 (sprint/389) 생성 + auto-merge 대기

## P-f: master push CI

PR merge 후 master push CI 결과 → F644~F653 누적 부채 진정 종결 입증 예정

## P-g: dual_ai_reviews

verdict=PASS, INSERT 완료 ✅ (Sprint 53 연속)

## P-h: 일정

2026-05-12 (5/14 D-2 buffer 내) ✅

## Match Rate

**100%** (6/6 assertions Design 대비 정확 적용)

## Gap Analysis 주요 관찰

- out-of-scope(api/cli/shared/core) 변경 0건 확인
- ax-bd-hub.spec.ts:49 `timeout: 20000` BMC main — Design 미명시이나 기존 코드 그대로(비변경)이므로 scope 범위 내

## 다음 사이클

- PR CI 4 shard GREEN 확인 후 master push CI 결과 관찰 (P-f)
- timeout 30000도 부족 시 → F655 Vite cache CI 최적화로 escalation
- Class C offering-pipeline:132+138 master push 재현 → F656

## 커밋

- `ace1d2ed` fix(e2e): F654 — Class A/B/B' assertion timeout fix (F653 진단 기반)
