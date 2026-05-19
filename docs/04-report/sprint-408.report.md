---
code: FX-RPRT-408
title: Sprint 408 F674 — ax-harness-kit improvements I-4 + I-5
sprint: 408
f_items: F674
match_rate: 100
status: Done
date: 2026-05-19
author: Sinclair Seo
---

# Sprint 408 Report — F674 ax-harness-kit improvements I-4 + I-5

## §1 결과 요약

| 항목 | 값 |
|------|-----|
| Sprint | 408 |
| F-item | F674 (FX-REQ-736, P1) |
| Match Rate | 100% |
| Tests | 102/102 PASS (harness-kit, +4 신규) |
| 신규 파일 | 7건 |
| 수정 파일 | 2건 |
| Self-Dogfood | Foundry-X deploy.yml 20→22 + engines.node 추가 |

## §2 구현 내역

### I-4: .nvmrc 3-way Consistency CI Gate

**신규 템플릿 2종**:
- `templates/monorepo/scripts/setup/verify-node-consistency.sh.hbs` — `.nvmrc` / `package.json engines.node` / `.github/workflows/*.yml node-version` 3-way 일치 검증 (grep 기반, jq 미사용)
- `templates/monorepo/.github/workflows/node-consistency.yml.hbs` — `.nvmrc`/`package.json`/`.github/workflows/*.yml` 변경 시 자동 CI 게이트 트리거

### I-5: drift check 실행 검증 (integration tests)

T33~T36 4건 신규 추가 (`__tests__/scaffold/monorepo.test.ts`):
- T33: verify-node-consistency.sh 생성 + executable bit
- T34: node-consistency.yml 생성 + paths trigger
- T35: verify-node-consistency.sh exit 0 (3-way 일치 실행 검증)
- T36: check-harness-drift.sh exit 0 (동일 rules reference 대조)

### Foundry-X Self-Dogfood (즉시 가치 입증)

I-4가 자신을 fix: Foundry-X `deploy.yml` `node-version: 20` → `22` (4곳) + root `package.json` `engines.node: ">=22"` 추가 → 3-way 일치 회복.

## §3 Gate-x 4th Dogfood 결과

```
$ bash scripts/setup/verify-node-consistency.sh
✅ Node version 3-way consistency OK (v22)

$ bash scripts/setup/check-harness-drift.sh ~/work/axbd/Foundry-X/.claude/rules
3 expected drifts (Foundry-X-specific: security.md URL, serverkit-cq.md 예시, sprint-ops.md 미포함)
→ 도구 정상 동작 확인
```

scaffold file count: 160 files (all flags + .git)

## §4 ax-harness-kit Improvements 완결 상태

| ID | 내용 | Sprint |
|----|------|--------|
| I-1 | D1 auto-create / 수동 inject | F673 S407 |
| I-2 | SETUP.md 자동 생성 | F673 S407 |
| I-3 | git init + initial commit | F673 S407 |
| I-4 | .nvmrc 3-way consistency CI 게이트 | F674 S408 ✅ |
| I-5 | drift check integration test | F674 S408 ✅ |

**모든 권고 개선 완결** — S365 F671 Dogfood findings → S407+S408 2 sprint 완전 해소.

## §5 메타 학습

1. **Self-dogfood 즉시 가치 입증 패턴** — I-4 도구를 만들어 같은 sprint에서 Foundry-X 자신의 drift를 fix. "도구 제작 = 즉시 적용 증명" 사이클.
2. **velocity stale 답습 패턴 9회차 차단** — f_items=F674 정확, duration=35 정확.
3. **🏆 72 sprint streak** (S306~S368, F560~F674).
