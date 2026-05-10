# Sprint 380 Plan — F643 bashrc sprint() L1 fix

> **Sprint**: 380 | **F-item**: F643 | **REQ**: FX-REQ-708 | **Priority**: P2
> **Date**: 2026-05-10 | **Session**: S351

## 1. 목표

bashrc `sprint()` 함수에서 Stale F_ITEMS가 signal + `.sprint-context`에 기록되는 버그를 영구 차단한다.
16회 재현 누적 (S256~S350) → lifecycle 승격 임계점 도달 → 이번 Sprint에서 근본 해소.

## 2. 근본 원인 진단 (S351 실측)

### Root Cause #1 (PRIMARY): `.sprint-context` 읽기 시 SPRINT_NUM 검증 없음

`~/.bashrc` L393-395:
```bash
if [ -f "$wt_dir/.sprint-context" ]; then
  f_items=$(grep "^F_ITEMS=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
fi
```

`$wt_dir/.sprint-context`가 존재하면 내용의 SPRINT_NUM이 현재 `$num`과 일치하는지 검증하지 않고
그대로 사용. 파일이 다른 sprint 컨텍스트(stale)로 채워져 있으면 잘못된 F_ITEMS 반환.

**발생 시나리오**: sprint-pipeline이나 autopilot이 `.sprint-context`를 생성했는데 SPEC 갱신 전이었던 경우,
또는 worktree cleanup 불완전으로 직전 sprint의 파일 잔재.

### Root Cause #2 (SECONDARY): awk 서브스트링 매칭

`~/.bashrc` L398:
```bash
f_items=$(awk -F'|' -v s="Sprint ${num}" '$4 ~ s {match($2,/F[0-9]+/); ...}' SPEC.md ...)
```

`$4 ~ s`는 regex substring match → "Sprint 380" 패턴이 " Sprint 3800 "에도 매칭됨.
Sprint 번호가 4자리 이상으로 증가하면 false match 발생 가능.

### Root Cause #3 (SECONDARY): signal 파일 조건 검사

`~/.bashrc` L452:
```bash
if [ ! -f "$sig_file" ]; then
  cat > "$sig_file" << ...
fi
```

signal 파일이 이미 존재하면 갱신 안 함 → stale signal 잔존 가능.
단, 파일 경로가 `${project}-${num}.signal`이므로 정상 케이스에서는 충돌 드묾.

### Root Cause #4: tmux session/window 이름

F_ITEMS stale시 tmux 세션명도 stale sprint 제목으로 생성됨 (cosmetic, but confusing).

## 3. 범위 (Cross-repo Dual-track)

### Track A: Foundry-X 내부 (이번 Sprint)
- `scripts/__tests__/test-sprint-fitems.sh` — 회귀 테스트 3+ 시나리오
- `reports/sprint-380-bashrc-patch.diff` — ~/.bashrc 패치 draft
- `docs/rules/development-workflow.md` 갱신 — Stale F_ITEMS 16회→fixed 표기
- Plan + Design 문서

### Track B: 외부 수동 적용 (Master post-merge)
- `~/.bashrc` — patch 적용 (sprint() 함수 3종 fix)
- `~/scripts/wt-claude-worktree.sh` — (필요 시) 동일 패턴 보정
- 신규 Sprint 381 시동 → stale 0건 실 측정 검증

## 4. 구현 내용 (Track A 코드)

### 4-1. awk 정확 매칭 강화 (RC #2 fix)
```bash
# Before: substring regex match
f_items=$(awk -F'|' -v s="Sprint ${num}" '$4 ~ s {...}' SPEC.md ...)

# After: exact column match (trim whitespace + == comparison)
f_items=$(awk -F'|' -v s="Sprint ${num}" '{
  col4=$4; gsub(/^[[:space:]]+|[[:space:]]+$/,"",col4)
  if (col4 == s) { match($2,/F[0-9]+/); if(RSTART) print substr($2,RSTART,RLENGTH) }
}' SPEC.md 2>/dev/null | paste -sd, -)
```

### 4-2. .sprint-context 읽기 SPRINT_NUM 검증 (RC #1 fix)
```bash
# Before: no validation
if [ -f "$wt_dir/.sprint-context" ]; then
  f_items=$(grep "^F_ITEMS=" ...)
fi

# After: SPRINT_NUM validation
if [ -f "$wt_dir/.sprint-context" ]; then
  local ctx_num
  ctx_num=$(grep "^SPRINT_NUM=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
  if [ "$ctx_num" = "$num" ]; then
    f_items=$(grep "^F_ITEMS=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
  else
    echo "⚠️ [sprint-context drift] SPRINT_NUM=${ctx_num} != ${num} — SPEC.md 재추출" >&2
  fi
fi
```

### 4-3. signal 생성 후 검증 step (RC #3 fix)
```bash
# 기존 signal 있어도 force overwrite if SPRINT_NUM/F_ITEMS stale
local do_create=true
if [ -f "$sig_file" ]; then
  local sig_num sig_fitems
  sig_num=$(grep "^SPRINT_NUM=" "$sig_file" 2>/dev/null | cut -d= -f2)
  sig_fitems=$(grep "^F_ITEMS=" "$sig_file" 2>/dev/null | cut -d= -f2)
  if [ "$sig_num" = "$num" ] && { [ -z "$f_items" ] || [ "$sig_fitems" = "$f_items" ]; }; then
    echo "📡 Signal 이미 존재 (검증 OK): ${sig_file}"
    do_create=false
  else
    echo "⚠️ [signal drift] SPRINT_NUM=${sig_num}/${num} F_ITEMS=${sig_fitems}/${f_items} — force overwrite" >&2
  fi
fi
if $do_create; then
  cat > "$sig_file" <<SIG
  ...
SIG
fi
```

## 5. 테스트 시나리오 (≥3)

| # | 시나리오 | 기대 결과 |
|---|---------|---------|
| T1 | 정상: 신규 WT + SPEC에 Sprint N 등록됨 | F_ITEMS 정확 추출 |
| T2 | Stale: `.sprint-context` 다른 SPRINT_NUM 포함 | warn 출력 + SPEC.md로 재추출 |
| T3 | Signal 잔존: 동일 sprint signal이 다른 F_ITEMS | warn 출력 + force overwrite |
| T4 | awk 경계: "Sprint 38" 패턴이 "Sprint 380" 매칭 금지 | 정확 sprint row만 매칭 |

## 6. DoD (Phase Exit P-a~P-h)

| # | 항목 |
|---|------|
| P-a | sprint() 함수 awk 매칭 정확 매칭 적용 (whitespace trim + `==`) |
| P-b | `.sprint-context` 읽기 시 SPRINT_NUM 검증 step 추가 |
| P-c | signal 생성 조건 drift 검출 + force overwrite 로직 |
| P-d | tmux session/window 이름 stale 차단 (warning 출력) |
| P-e | 회귀 테스트 T1~T4 모두 PASS |
| P-f | `reports/sprint-380-bashrc-patch.diff` 생성 (적용 가능한 unified diff) |
| P-g | `rules/development-workflow.md` "Stale F_ITEMS" 섹션 16회차→fixed 표기 갱신 |
| P-h | dual_ai_reviews sprint 380 자동 INSERT ≥ 1건 |

## 7. 의존성

없음 (독립 작업, 외부 서비스 불필요).

## 8. 예상 시간

~30~45분 autopilot (테스트 + 패치 draft + 문서 갱신).
