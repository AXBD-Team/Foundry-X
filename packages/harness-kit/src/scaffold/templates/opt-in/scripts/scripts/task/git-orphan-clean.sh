#!/usr/bin/env bash
# git-orphan-clean.sh — 고아 git 리소스 안전 정리 (squash-aware)
#
# 사용:
#   git-orphan-clean.sh           # 확인 대화 후 실행
#   git-orphan-clean.sh --yes     # 확인 없이 실행
#   git-orphan-clean.sh --dry-run # 점검만
#
# 처리 대상:
#   1. MERGED PR이 붙은 로컬 브랜치 → 삭제 (squash-aware)
#   2. Missing worktree 참조 → git worktree prune
#   3. Stale remote tracking refs → git fetch --prune (L1 config가 있어도 강제)
#
# 처리 제외:
#   - CLOSED (not merged) PR 브랜치 → 유지 (작업 가능성)
#   - No-PR 브랜치 → 유지 (unpushed work 보호)
#   - 보호 대상 (is_protected) → 유지

set -uo pipefail

DRY=0
YES=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --yes|-y)  YES=1 ;;
  esac
done

command -v git >/dev/null 2>&1 || { echo "git 없음" >&2; exit 2; }
command -v gh  >/dev/null 2>&1 || { echo "gh 없음" >&2; exit 2; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "git repo 아님" >&2; exit 2; }

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "")
[ -n "$REPO" ] || { echo "GitHub repo 감지 실패" >&2; exit 2; }

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
PROJECT=$(basename "$(git rev-parse --show-toplevel)")

# ── 보호 대상 ──
declare -A PROTECTED
PROTECTED["master"]=1
PROTECTED["main"]=1
[ -n "$CURRENT_BRANCH" ] && PROTECTED["$CURRENT_BRANCH"]=1

while IFS= read -r line; do
  branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
  [ -n "$branch" ] && PROTECTED["$branch"]=1
done < <(git worktree list 2>/dev/null)

if command -v tmux >/dev/null 2>&1; then
  while IFS= read -r sess; do
    num=$(echo "$sess" | sed "s/sprint-${PROJECT}-//")
    [ -n "$num" ] && PROTECTED["sprint/$num"]=1
  done < <(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep "^sprint-${PROJECT}-" || true)
fi

if [ -d /tmp/sprint-signals ]; then
  for sig in /tmp/sprint-signals/*.signal; do
    [ -f "$sig" ] || continue
    status=$(grep "^STATUS=" "$sig" 2>/dev/null | cut -d= -f2)
    if [ "$status" = "IN_PROGRESS" ] || [ "$status" = "CREATED" ]; then
      num=$(grep "^SPRINT_NUM=" "$sig" 2>/dev/null | cut -d= -f2)
      [ -n "$num" ] && PROTECTED["sprint/$num"]=1
    fi
  done
fi

# ── 수집: 삭제 가능한 merged branches ──
TO_DELETE=()
KEEP_CLOSED=()
KEEP_OPEN=()
KEEP_NOPR=()

echo "🔍 Squash-aware 판정 중 (repo: ${REPO})..."
while IFS= read -r branch; do
  [ -n "$branch" ] || continue
  if [ "${PROTECTED[$branch]:-0}" = "1" ]; then
    continue
  fi
  pr_info=$(gh pr list --repo "$REPO" --head "$branch" --state all --json state,number --jq '.[0]' 2>/dev/null || echo "")
  if [ -z "$pr_info" ] || [ "$pr_info" = "null" ]; then
    KEEP_NOPR+=("$branch")
    continue
  fi
  state=$(echo "$pr_info" | python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); print(d.get('state','?'))" 2>/dev/null)
  num=$(echo "$pr_info" | python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); print(d.get('number',''))" 2>/dev/null)
  case "$state" in
    MERGED) TO_DELETE+=("${branch}|#${num}") ;;
    CLOSED) KEEP_CLOSED+=("${branch}|#${num}") ;;
    OPEN)   KEEP_OPEN+=("${branch}|#${num}") ;;
  esac
done < <(git for-each-ref --format='%(refname:short)' refs/heads/)

# ── 수집: missing WT ──
MISSING_WT=()
while IFS= read -r line; do
  wt_path=$(echo "$line" | awk '{print $1}')
  [ "$wt_path" = "$(git rev-parse --show-toplevel)" ] && continue
  [ -d "$wt_path" ] || MISSING_WT+=("$wt_path")
done < <(git worktree list 2>/dev/null)

# ── 리포트 + 확인 ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  정리 계획"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ${#TO_DELETE[@]} -eq 0 ] && [ ${#MISSING_WT[@]} -eq 0 ]; then
  echo "  정리 대상 없음 ✅"
  # prune은 항상 실행 (무해)
  git fetch --prune origin >/dev/null 2>&1 && echo "  (fetch --prune 실행)"
  exit 0
fi

if [ ${#TO_DELETE[@]} -gt 0 ]; then
  echo "  🔴 삭제 대상 brach (${#TO_DELETE[@]}):"
  for b in "${TO_DELETE[@]}"; do
    echo "    - ${b%|*} (PR ${b#*|})"
  done
fi

if [ ${#MISSING_WT[@]} -gt 0 ]; then
  echo "  🔴 prune 대상 WT (${#MISSING_WT[@]}):"
  for w in "${MISSING_WT[@]}"; do
    echo "    - $w"
  done
fi

if [ ${#KEEP_CLOSED[@]} -gt 0 ]; then
  echo "  🟡 유지 (CLOSED PR, 수동 확인 권장): ${#KEEP_CLOSED[@]}"
  for b in "${KEEP_CLOSED[@]}"; do echo "    - ${b%|*}"; done
fi
if [ ${#KEEP_OPEN[@]} -gt 0 ]; then
  echo "  🟢 유지 (OPEN PR, 작업 중): ${#KEEP_OPEN[@]}"
fi
if [ ${#KEEP_NOPR[@]} -gt 0 ]; then
  echo "  ⚪ 유지 (PR 없음): ${#KEEP_NOPR[@]}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $DRY -eq 1 ]; then
  echo "  --dry-run 모드 — 실제 삭제 안 함"
  exit 0
fi

if [ $YES -eq 0 ]; then
  echo ""
  read -p "  위 계획을 실행할까요? [y/N] " confirm
  [ "$confirm" = "y" ] || [ "$confirm" = "Y" ] || { echo "  취소됨"; exit 0; }
fi

# ── 실행 ──
echo ""
echo "=== 실행 ==="

# Branch 삭제 (squash merged는 -d로는 안 되고 -D 필요)
for entry in "${TO_DELETE[@]}"; do
  branch="${entry%|*}"
  pr="${entry#*|}"
  if git branch -D "$branch" 2>/dev/null; then
    echo "  ✅ deleted: $branch (PR $pr)"
  else
    echo "  ❌ failed: $branch"
  fi
done

# WT prune
if [ ${#MISSING_WT[@]} -gt 0 ]; then
  git worktree prune 2>&1 && echo "  ✅ worktree prune"
fi

# fetch --prune (remote tracking refs)
git fetch --prune origin >/dev/null 2>&1 && echo "  ✅ fetch --prune"

echo ""
echo "정리 완료. 재점검: git-orphan-scan.sh"
