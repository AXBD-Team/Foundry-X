# Sprint 380 Report — F643 bashrc sprint() L1 fix

> **Sprint**: 380 | **Match Rate**: 100% | **Test**: 10/10 PASS
> **Date**: 2026-05-10 | **Session**: S351

## 요약

Stale F_ITEMS 패턴 16회 재현 → L1 근본 fix 완료 (Foundry-X 내부 Track A).
~/.bashrc 실 적용은 Master post-merge 수동 작업 (Track B).

## 산출물

| 파일 | 내용 |
|------|------|
| `scripts/__tests__/test-sprint-fitems.sh` | 회귀 테스트 T1~T5 (10 assertions) |
| `reports/sprint-380-bashrc-patch.diff` | Fix A+B+C unified diff |
| `reports/sprint-380-rules-update.md` | rules/development-workflow.md 갱신 draft |

## 근본 원인 (확정)

1. **(RC #1 PRIMARY)** `.sprint-context` 읽기 시 SPRINT_NUM 검증 없음 → Fix B
2. **(RC #2)** awk substring match → Fix A (exact column match)
3. **(RC #3)** signal `[ ! -f ]` 조건 → Fix C (drift 검출 + force overwrite)

## DoD P-a~P-g: 7/7 PASS

P-h (dual_ai_reviews): Master post-merge patch 적용 + Sprint 381 시동 시 검증.

## Post-merge 수동 적용 (Track B)

```bash
cd ~/work/axbd/Foundry-X && git pull
patch -p0 < reports/sprint-380-bashrc-patch.diff
source ~/.bashrc
bash scripts/__tests__/test-sprint-fitems.sh
# Sprint 381 시동 후 stale 0건 확인 → F643 검증 완료
```
