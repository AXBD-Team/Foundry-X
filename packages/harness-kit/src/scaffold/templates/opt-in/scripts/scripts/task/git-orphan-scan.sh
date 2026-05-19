#!/usr/bin/env bash
# git-orphan-scan.sh — 고아 git 리소스 탐지 (squash-aware)
#
# 탐지 대상:
#   1. Local branches with MERGED PR (squash merge 대응)
#   2. Local branches with CLOSED (not merged) PR
#   3. Local worktrees with missing directory
#   4. Empty worktree parent directories
#   5. Stale remote tracking refs (fetch.prune로 대부분 해소되지만 확인)
#   6. Tmux pane zombies — pane cwd 물리 부재 / worktree list 이탈 / pane_dead=1
#      (S257 tmux 3.4 segfault 후속 방어선, S260/C27 도입)
#
# 사용:
#   git-orphan-scan.sh           # 점검만 (quiet 모드는 경고 수만 출력)
#   git-orphan-scan.sh --json    # 결과를 JSON으로
#   git-orphan-scan.sh --quiet   # 경고 건수만 (session-start 용)
#
# 보호 대상 (삭제 금지):
#   - master
#   - 현재 체크아웃된 branch
#   - git worktree에 연결된 branch
#   - tmux 세션 활성화된 sprint 번호
#   - /tmp/sprint-signals/ IN_PROGRESS/CREATED
#
# 종료 코드:
#   0 = 정상, 고아 없음
#   1 = 고아 발견
#   2 = 실행 환경 문제 (git/gh 없음 등)

set -uo pipefail

QUIET=0
JSON=0
for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=1 ;;
    --json)  JSON=1 ;;
  esac
done

log()  { [ $QUIET -eq 1 ] || echo "$@"; }
warn() { [ $QUIET -eq 1 ] || echo "⚠️  $@"; }
ok()   { [ $QUIET -eq 1 ] || echo "✅ $@"; }

# ── 사전 검증 ──
command -v git >/dev/null 2>&1 || { echo "git 없음" >&2; exit 2; }
command -v gh  >/dev/null 2>&1 || { echo "gh 없음" >&2; exit 2; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "git repo 아님" >&2; exit 2; }

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "")
[ -n "$REPO" ] || { echo "GitHub repo 감지 실패" >&2; exit 2; }

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
PROJECT=$(basename "$(git rev-parse --show-toplevel)")

# ── 보호 대상 수집 ──
declare -A PROTECTED
PROTECTED["master"]=1
PROTECTED["main"]=1
[ -n "$CURRENT_BRANCH" ] && PROTECTED["$CURRENT_BRANCH"]=1

# Worktree에 연결된 branch
while IFS= read -r line; do
  branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
  [ -n "$branch" ] && PROTECTED["$branch"]=1
done < <(git worktree list 2>/dev/null)

# tmux 활성 sprint 세션 → sprint/N 보호
if command -v tmux >/dev/null 2>&1; then
  while IFS= read -r sess; do
    num=$(echo "$sess" | sed "s/sprint-${PROJECT}-//")
    [ -n "$num" ] && PROTECTED["sprint/$num"]=1
  done < <(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep "^sprint-${PROJECT}-" || true)
fi

# signal 파일 기반 보호
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

is_protected() {
  [ "${PROTECTED[$1]:-0}" = "1" ]
}

# ── 탐지 ──
ORPHAN_LOCAL_MERGED=()
ORPHAN_LOCAL_CLOSED=()
ORPHAN_LOCAL_NOPR=()
ORPHAN_WT_MISSING=()
EMPTY_WT_PARENT=""
ZOMBIE_PANES=()        # "pane_id|cwd|reason" (reason = cwd_missing / wt_unlisted / pane_dead)

log "🔍 Git orphan 탐지 (repo: ${REPO})"
log ""

# Phase 1: 로컬 brach 스캔
log "── Phase 1: 로컬 branch (PR API 기반 판정) ──"
while IFS= read -r branch; do
  [ -n "$branch" ] || continue
  if is_protected "$branch"; then
    log "  🛡️  protected: $branch"
    continue
  fi

  # gh pr list로 squash-aware 판정
  pr_info=$(gh pr list --repo "$REPO" --head "$branch" --state all --json state,number --jq '.[0]' 2>/dev/null || echo "")

  if [ -z "$pr_info" ] || [ "$pr_info" = "null" ]; then
    ORPHAN_LOCAL_NOPR+=("$branch")
    log "  ❓ no PR: $branch"
  else
    state=$(echo "$pr_info" | python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); print(d.get('state','?'))" 2>/dev/null)
    num=$(echo "$pr_info" | python3 -c "import json,sys; d=json.loads(sys.stdin.read() or '{}'); print(d.get('number',''))" 2>/dev/null)
    case "$state" in
      MERGED)
        ORPHAN_LOCAL_MERGED+=("$branch|#$num")
        log "  🔴 MERGED (orphan): $branch (PR #$num)"
        ;;
      CLOSED)
        ORPHAN_LOCAL_CLOSED+=("$branch|#$num")
        log "  🟡 CLOSED (orphan): $branch (PR #$num)"
        ;;
      OPEN)
        log "  🔒 OPEN (active): $branch (PR #$num)"
        ;;
    esac
  fi
done < <(git for-each-ref --format='%(refname:short)' refs/heads/)

# Phase 2: Worktree 점검
log ""
log "── Phase 2: Worktree 상태 ──"
while IFS= read -r line; do
  wt_path=$(echo "$line" | awk '{print $1}')
  wt_branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
  [ "$wt_path" = "$(git rev-parse --show-toplevel)" ] && continue
  if [ ! -d "$wt_path" ]; then
    ORPHAN_WT_MISSING+=("$wt_path")
    log "  🔴 WT 디렉토리 없음: $wt_path ($wt_branch)"
  else
    log "  ✅ WT 활성: $wt_path ($wt_branch)"
  fi
done < <(git worktree list 2>/dev/null)

# Phase 3: 빈 WT parent 디렉토리
WT_BASE="${CLAUDE_WT_BASE:-/home/sinclair/work/worktrees}"
PROJECT_WT_DIR="${WT_BASE}/${PROJECT}"
if [ -d "$PROJECT_WT_DIR" ]; then
  child_count=$(ls -A "$PROJECT_WT_DIR" 2>/dev/null | wc -l)
  if [ "$child_count" = "0" ]; then
    EMPTY_WT_PARENT="$PROJECT_WT_DIR"
    log ""
    log "── Phase 3: 빈 WT parent 디렉토리 ──"
    log "  ⚠️  비어 있음: $PROJECT_WT_DIR (삭제 선택사항)"
  fi
fi

# Phase 4: tmux pane zombies (S260/C27)
# 좀비 조건 3종: (1) cwd 물리 부재, (2) git worktree list에 없는 경로, (3) pane_dead=1
if command -v tmux >/dev/null 2>&1 && tmux list-panes -a >/dev/null 2>&1; then
  log ""
  log "── Phase 4: tmux pane zombies ──"

  # 현재 유효한 worktree 경로 집합 (exact match용)
  declare -A VALID_WT_PATHS
  while IFS= read -r wt_line; do
    wt_root=$(echo "$wt_line" | awk '{print $1}')
    [ -n "$wt_root" ] && VALID_WT_PATHS["$wt_root"]=1
  done < <(git worktree list 2>/dev/null)

  # pane 순회: id / dead flag / cwd
  while IFS=$'\t' read -r pane_id pane_dead pane_cwd; do
    [ -n "$pane_id" ] || continue

    # (3) pane_dead=1
    if [ "$pane_dead" = "1" ]; then
      ZOMBIE_PANES+=("${pane_id}|${pane_cwd}|pane_dead")
      log "  💀 pane_dead: $pane_id ($pane_cwd)"
      continue
    fi

    # (1) cwd 물리 부재
    if [ -n "$pane_cwd" ] && [ ! -d "$pane_cwd" ]; then
      ZOMBIE_PANES+=("${pane_id}|${pane_cwd}|cwd_missing")
      log "  💀 cwd_missing: $pane_id ($pane_cwd)"
      continue
    fi

    # (2) worktree list 이탈 — project WT base 아래에 있는데 등록 해제된 경로
    WT_BASE_CHECK="${CLAUDE_WT_BASE:-/home/sinclair/work/worktrees}"
    if [ -n "$pane_cwd" ] && [[ "$pane_cwd" == "$WT_BASE_CHECK"/* ]]; then
      # pane cwd의 WT 루트 후보를 추정: WT_BASE/project/wt-name (3 depth)
      wt_candidate=$(echo "$pane_cwd" | awk -F/ -v base="$WT_BASE_CHECK" '
        BEGIN{split(base,b,"/"); n=0; for(i in b) n++}
        {path=""; for(i=1;i<=n+2 && i<=NF;i++) path=path"/"$i; sub(/^\//,"",path); print "/"path}
      ')
      if [ -n "$wt_candidate" ] && [ -z "${VALID_WT_PATHS[$wt_candidate]:-}" ]; then
        ZOMBIE_PANES+=("${pane_id}|${pane_cwd}|wt_unlisted")
        log "  💀 wt_unlisted: $pane_id ($pane_cwd, candidate=$wt_candidate)"
      fi
    fi
  done < <(tmux list-panes -a -F $'#{pane_id}\t#{pane_dead}\t#{pane_current_path}' 2>/dev/null)

  if [ ${#ZOMBIE_PANES[@]} -eq 0 ]; then
    log "  ✅ tmux pane zombies 없음"
  fi
fi

# ── 결과 집계 ──
TOTAL=$((${#ORPHAN_LOCAL_MERGED[@]} + ${#ORPHAN_LOCAL_CLOSED[@]} + ${#ORPHAN_WT_MISSING[@]}))
ZOMBIE_COUNT=${#ZOMBIE_PANES[@]}

if [ $JSON -eq 1 ]; then
  python3 <<PYEOF
import json
result = {
  "repo": "$REPO",
  "merged_branches": [x.split("|")[0] for x in """${ORPHAN_LOCAL_MERGED[@]:-}""".split()],
  "closed_branches": [x.split("|")[0] for x in """${ORPHAN_LOCAL_CLOSED[@]:-}""".split()],
  "unknown_branches": """${ORPHAN_LOCAL_NOPR[@]:-}""".split(),
  "missing_worktrees": """${ORPHAN_WT_MISSING[@]:-}""".split(),
  "empty_wt_parent": "$EMPTY_WT_PARENT",
  "zombie_panes": [{"pane": x.split("|")[0], "cwd": x.split("|")[1], "reason": x.split("|")[2]}
                   for x in """${ZOMBIE_PANES[@]:-}""".split() if "|" in x],
  "total_orphans": $TOTAL,
  "zombie_count": $ZOMBIE_COUNT,
}
print(json.dumps(result, indent=2))
PYEOF
  exit $([ $TOTAL -gt 0 ] && echo 1 || echo 0)
fi

if [ $QUIET -eq 1 ]; then
  # session-start 친화: 한 줄로 요약 — zombie는 exit code에 영향 안 줌(tool 문제 아닌 환경 상태)
  zombie_suffix=""
  [ $ZOMBIE_COUNT -gt 0 ] && zombie_suffix=" (tmux zombies: ${ZOMBIE_COUNT})"
  if [ $TOTAL -eq 0 ]; then
    echo "Git orphan: 0건${zombie_suffix}"
  else
    echo "Git orphan: ${TOTAL}건 (merged=${#ORPHAN_LOCAL_MERGED[@]}, closed=${#ORPHAN_LOCAL_CLOSED[@]}, wt=${#ORPHAN_WT_MISSING[@]})${zombie_suffix} — git-orphan-clean.sh 실행 권장"
  fi
  exit $([ $TOTAL -gt 0 ] && echo 1 || echo 0)
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  고아 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MERGED brach : ${#ORPHAN_LOCAL_MERGED[@]} (안전 삭제)"
echo "  CLOSED brach : ${#ORPHAN_LOCAL_CLOSED[@]} (확인 후 삭제)"
echo "  Unknown brach: ${#ORPHAN_LOCAL_NOPR[@]} (PR 없음, 유지)"
echo "  Missing WT   : ${#ORPHAN_WT_MISSING[@]} (prune 대상)"
echo "  Pane zombies : ${ZOMBIE_COUNT} (tmux kill-pane 대상)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $TOTAL -gt 0 ]; then
  echo "  → git-orphan-clean.sh 로 정리"
  exit 1
else
  echo "  → 고아 없음 ✅"
  exit 0
fi
