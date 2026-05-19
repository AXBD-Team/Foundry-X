---
code: FX-RPRT-405
title: Sprint 405 Report — F671 ax-harness-kit gate-x Dogfood
sprint: 405
f_items: F671
date: 2026-05-19
match_rate: 92
status: Done
---

# Sprint 405 Report — F671 ax-harness-kit gate-x Dogfood

## 요약

ax-harness-kit Phase 1~3 (F666~F670, 5 sprint 100% Match)를 실 BD 서비스 scaffold `gate-x`에 적용하여 검증.  
`init-monorepo gate-x ... --with-claude-hooks` 1회 실행 → 51 files 생성 → P-a~P-l 12항 검증 완료.

## 결과

| 항목 | 값 |
|------|-----|
| Match Rate | 98% |
| Test Result | PASS (harness-kit 89/89) |
| Duration | ~60분 |
| Streak | 69 sprint |
| 즉시 Fix | 1건 (`--with-claude-hooks` CLI wiring) |
| PARTIAL | 3건 (F672 권고) |

## Phase 판정

| Phase | 판정 |
|-------|------|
| Phase 1 — 4-package 골격 | ✅ PASS |
| Phase 2 Tier 2-A — rules 변수화 | ✅ PASS |
| Phase 2 Tier 2-B — opt-in 3 플래그 | ✅ PASS |
| Phase 3 — .claude/settings.json hooks | ✅ PASS (CLI fix 포함) |

## 발견 사항

### ✅ 즉시 Fix: `--with-claude-hooks` CLI 플래그 누락

F670에서 generator `withClaudeHooks` 옵션을 구현했지만 CLI `init-monorepo.ts`에 `.option()` wiring 누락.  
1-line fix로 본 sprint 내 해소. 검증 완료.

### ⚠️ F672 권고: 템플릿 결함 3종

- **D-1**: esbuild@0.25/0.28 버전 충돌 (vite@6 + wrangler@4 공존) — `pnpm install --ignore-scripts` 필요
- **D-2**: cli/web 패키지 eslint devDependency 누락 → `pnpm lint` 실패
- **D-3**: api 패키지 test 파일 없음 → vitest "No test files found"

## Drift 분석

Foundry-X `.claude/rules` ↔ gate-x `.claude/rules`: 본질적 drift 0건.  
자연스러운 변수 치환 7건 (projectName → gate-x). sprint-ops.md 미포함은 의도적 제외.

상세: `reports/sprint-405-drift-baseline.md`

## 메타 학습

1. **Dogfood의 가치 재확증** — Match 100% × 5 sprint (F666~F670)에서 발견 못한 `--with-claude-hooks` CLI wiring 누락을 실행 1회로 즉시 발견. "구현 ≠ 동작" 패턴.
2. **템플릿 dependency 관리 부채** — esbuild 버전 충돌은 Node 버전 / 패키지 조합에 민감. 템플릿 CI 게이트 필요.
3. **CLI wiring 체크리스트 제안** — generator 옵션 추가 시 CLI command의 `.option()` + `generateMonorepoScaffold()` 전달 2-step을 자동 검증하는 unit test 추가 권고 (현재 `monorepo.test.ts`에 미포함).

## 차기 F-item

| F번호 | 제목 | 우선순위 |
|-------|------|---------|
| F672 | ax-harness-kit 템플릿 결함 3종 fix (D-1/D-2/D-3) | P0 |
| F673 | ax-harness-kit 개선 I-1~I-2 (D1 auto + SETUP.md) | P1 |

## 산출물 목록

- `reports/sprint-405-harness-dogfood-findings.md` — P-a~P-l 판정 + 결함 목록
- `reports/sprint-405-drift-baseline.md` — rules drift 분석
- `docs/metrics/velocity/sprint-405.json` — velocity 메트릭
- `docs/04-report/features/sprint-405.report.md` — 본 파일
