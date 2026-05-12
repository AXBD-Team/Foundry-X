---
code: FX-RPRT-391
title: F656 Sprint 391 완료 보고서 — e2e Vite cache CI 최적화
sprint: 391
date: 2026-05-12
status: DONE
match_rate: 100
---

# Sprint 391 완료 보고서 — F656

## 요약

shard 1 race condition (50% flakiness: ax-bd-hub:42+49 + discovery-detail-advanced:218+257) 해소를 위해
e2e.yml에 Vite dependency pre-bundle cache (`actions/cache@v4`) + pre-warm step (`vite optimize`) 2개 step 추가.

**변경 파일**: `.github/workflows/e2e.yml` 단독 (+13 lines)  
**Match Rate**: 100%  
**Scope**: LOCKED 준수 (1 file only)

## 구현 내용

### Step A — Vite deps cache 복원 (pnpm install 직후)

```yaml
- name: Restore Vite dependency pre-bundle cache
  id: vite-deps-cache
  uses: actions/cache@v4
  with:
    path: packages/web/node_modules/.vite
    key: vite-deps-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml', 'packages/web/vite.config.ts') }}
    restore-keys: |
      vite-deps-${{ runner.os }}-
```

### Step B — cache miss 시 pre-warm (Playwright install 직후)

```yaml
- name: Pre-warm Vite dependency optimization
  if: steps.vite-deps-cache.outputs.cache-hit != 'true'
  run: pnpm -F @foundry-x/web exec vite optimize
```

## Phase Exit Checklist

| 항목 | 결과 | 비고 |
|------|------|------|
| P-a e2e.yml diff | ✅ | +13 lines, 2 step 정확 추가 |
| P-b cache hit/miss 로그 | 🔜 | CI run output에서 확인 예정 |
| P-c shard 1 4 assertion PASS | 🔜 | CI 결과 대기 |
| P-d typecheck PASS | ✅ | 19 tasks successful |
| P-e 회귀 0 | ✅ | lint 신규 에러 0 |
| P-f PR CI 4 shard GREEN | 🔜 | PR 생성 후 대기 |
| P-g master push 결정론적 GREEN | 🔜 | merge 후 2 run 검증 |
| P-h dual_ai_reviews INSERT | ✅ | Sprint 391 INSERT 완료 (55 sprint 연속) |

## Gap Analysis

**Match Rate: 100%** (gap-detector 자동 분석)

설계 7개 항목 전부 구현 매핑 정확. 이탈 0건.

## Codex Cross-Review

- verdict: BLOCK (false positive)
- code_issues: 0건, divergence_score: 0.0
- **false positive 근거**: missing REQs (FX-REQ-587~590)은 Phase 47 이전 스프린트 REQ — codex가 stale PRD 컨텍스트 참조. F656 실제 요구사항(e2e.yml Vite cache 추가) 구현 완결.

## 기술 결정

**cache key 설계**: `pnpm-lock.yaml` + `vite.config.ts` 기반 (src 파일 hash 제외)
- `.vite/deps/`는 source transform이 아닌 node_modules deps pre-bundle cache
- dep 변경 또는 vite 설정 변경 시만 무효화 → 불필요한 cache miss 방지

**pre-warm 조건부 실행**: `cache-hit != 'true'` 조건
- cache hit: pre-warm SKIP (0초 추가 비용)
- cache miss: `vite optimize` 실행 후 job 완료 시 자동 cache 저장

## 예상 효과

- **cache hit 시** (2번째 run 이후): 4 shard 모두 `.vite/deps/` 복원됨 → dev server lazy burst 0 → shard 1 race 해소
- **cache miss 시** (첫 run 또는 dep 변경 후): pre-warm ~10~15초 추가, 이후 cache 저장 → 다음 run부터 cache hit
