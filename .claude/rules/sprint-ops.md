# Sprint 운영 필수 규칙

> 반복 위반된 feedback memory를 rules/로 승격한 파일 (S268 근본 해소)
> MEMORY.md feedback은 "선택적으로 읽힘", rules/는 "항상 읽힘"

## 1. Master Monitor 필수 (S256 교훈, S268 재위반)

Sprint WT 또는 /ax:task가 **1개 이상** 가동 중이면, `/ax:sprint start` 완료 직후 **반드시 Monitor 도구를 시작**한다.

```
Monitor(
  description: "Sprint N signal + merge-monitor",
  persistent: true,
  command: signal + merge-monitor 로그 tail
)
```

**트리거**: `/ax:sprint start` Phase 5 완료 직후 (bash 모니터와 별도로 Claude Monitor 도구)
**위반 시 증상**: 사용자가 "왜 모니터 안 떠있어?" 질문 — 이미 3회 이상 지적됨

## 2. cs(Claude Squad) 미사용 (S268 교훈)

Sprint WT에서 cs를 자동 실행하지 않는다. ccs 단일 경로만 사용.
- cs가 자체 tmux 세션 + `~/.claude-squad/worktrees/`를 생성하여 Sprint 세션과 이중 구조 충돌
- `cs reset`이 Sprint pane까지 파괴
- 대체: `ccs --model sonnet` + `/ax:sprint-autopilot`

## 3. Sprint 탭 = 배너 + bash 셸 대기 (S268 변경)

`wt-claude-worktree.sh`와 bashrc fallback 모두 `exec bash`로 셸 대기.
ccs는 Master에서 `tmux send-keys`로 주입한다.

```
Phase 3 흐름:
  tmux send-keys -t "$SESSION" "ccs --model sonnet" Enter
  (대기 후)
  tmux send-keys -t "$SESSION" "/ax:sprint-autopilot" Enter
```

## 4. WT 탭 필수 열기 (S271 교훈, 3회 이상 재발)

Sprint WT 생성 후 **Windows Terminal 탭을 반드시 열어야** 한다. tmux detached만으로는 불충분.

**근본 원인**: Claude Code Bash tool은 non-TTY라 `bash -i -c "sprint N"`이 실패 → bashrc sprint() 내부의 wt.exe 호출에 도달하지 못함.

**필수 fallback (bashrc sprint() 실패 시)**:
1. `git worktree add` 직접 실행 (Phase 2a)
2. `tmux new-session -d` 배너+셸 생성 (Phase 2b)
3. **wt.exe로 WT 탭 열기** (Phase 2c — 절대 생략 금지):
```bash
WTE="/mnt/c/Users/sincl/AppData/Local/Microsoft/WindowsApps/wt.exe"
"$WTE" -w 0 new-tab --title "$TAB_TITLE" --suppressApplicationTitle \
  -- wsl.exe -d Ubuntu-24.04 bash -lic "tmux attach -t \"$SESSION_NAME\""
```

**위반 시 증상**: 사용자가 "WT 창이 안 보여" 질문

## 5. task-daemon 필수 시작 (S271 교훈)

Sprint WT 생성 후 **task-daemon이 실행 중인지 확인**하고, 없으면 시작한다.

**근본 원인**: bashrc sprint()의 `_sprint_ensure_monitor()`가 daemon을 시작하지만, Claude Code에서 sprint() 실패 시 이 호출이 누락됨.

**필수 조치 (Phase 2d)**:
```bash
DAEMON_SCRIPT="$(git rev-parse --show-toplevel)/scripts/task/task-daemon.sh"
[ -f "$DAEMON_SCRIPT" ] && bash "$DAEMON_SCRIPT" --bg
```

**위반 시 증상**: signal 감지/merge 자동화가 동작하지 않아 Sprint 완료 후 수동 merge 필요

## 6. SPEC.md F-item row pipe escape 필수 (S370 8회차 누적 lifecycle 승격, 2026-05-20)

SPEC.md §5 F-item table row의 **description 컬럼**에 unescaped `|` 문자가 있으면 markdown table column 파싱이 misparse되어 `content-sync-check.sh` 및 bashrc `sprint()` 함수의 F_ITEMS 추출이 실패한다. F643 fix(L1~L3, S351 영구 차단)로 root cause 해소된 `.sprint-context` stale 패턴과 **별개의 silent layer**.

### 증상 (silent layer 7 패턴)
- bashrc `sprint()` Phase L393~395 awk 매칭이 column shift로 인해 F_ITEMS 컬럼 위치 오인식
- signal 파일 `F_ITEMS=` 비어있거나 잘못된 값
- `content-sync-check.sh`가 expected column N 추출 시도하다 stale value 반환 (예: 397→409 신규 sprint인데 stale 397)
- autopilot 시동 시 잘못된 F-item으로 작업 → master 수동 보정 필요

### 재현 8회 누적 (lifecycle 승격 임계)
| 회차 | Sprint | F-item | 패턴 | 처리 |
|------|--------|--------|------|------|
| 1 | Sprint 396 F662 | description 정상 | (정상 케이스) | — |
| 2 | Sprint 397 F663 | description 정상 | (정상 케이스) | — |
| 3 | Sprint 398 F664 | `"decision"\|"transition"` unescaped | column 7→9 변종 | autopilot 즉시 escape fix |
| 4 | Sprint 399 F665 | description 정상 | (정상 케이스) | — |
| 5 | Sprint 405 F671 | description 정상 (학습 효과 1) | (정상) | — |
| 6 | Sprint 406 F672 | description 정상 (학습 효과 2) | (정상) | — |
| 7 | Sprint 407 F673 | unescaped pipe 재현 | F_ITEMS 추출 실패 → master 수동 보정 + master `ceabbe2d` (pipe escape) | 즉시 fix |
| 8 | Sprint 408 F674 | description 처음부터 pipe escape (학습 효과 3) | (정상, 회피 정착) | — |
| (현재) | Sprint 409+ F675~F676 | (정상 유지) | — | — |

8회차 누적으로 lifecycle 승격 조건 A(2회+) 충족 + 향후 1년+ 재발 가능성 상존 → 본 섹션으로 명문화.

### 표준 절차 (3-step)

1. **F-item row description 작성 시 pipe escape 의무화**:
   - SPEC.md table cell에 `|` 포함 시 반드시 `\|` 또는 `&#124;` 사용
   - 예: `"decision" 또는 "transition"` (단어 풀어쓰기 권장) 또는 `\"decision\"\|\"transition\"` (코드 그대로 인용 시)
   - 코드 inline `` `code` `` 안의 `|`도 escape 필요 (markdown table 파서는 inline code 구분 안 함)

2. **Sprint 시동 직전 sanity check (Plan 단계)**:
   ```bash
   # Plan 작성 후 master commit 직전:
   awk -F'|' '/^\| F[0-9]+/ {print NF, $0}' SPEC.md | grep -v "^9 " | head
   # column 수 9가 아닌 row가 있으면 silent layer 7 의심
   ```

3. **Sprint 시동 시 signal F_ITEMS 즉시 검증**:
   ```bash
   # bash -i -c "sprint N" 직후:
   grep "^F_ITEMS=" /tmp/sprint-signals/${PROJECT}-${N}.signal
   # F_ITEMS 비어있거나 직전 sprint 값이면 silent layer 7 의심 → SPEC.md 해당 row pipe escape 점검
   ```

### Plan 단계 checklist (의무화)
- [ ] Plan §3 fs 실측 단계에서 F-item row description의 pipe escape 확인 (`grep '|' SPEC.md | grep "F${N}" | grep -v '\\|'`)
- [ ] master commit 전 awk column 수 9 일치 확인
- [ ] sprint() 시동 직후 signal F_ITEMS 값 검증

### Anti-pattern
- ❌ F-item description에 `"option1"|"option2"` 같은 코드 표기 그대로 사용 (escape 누락)
- ❌ inline code 안의 `|`도 escape 필요한 것을 간과 (markdown table 파서 한계)
- ❌ signal F_ITEMS 비어있을 때 silent 무시 + master 수동 보정만 (root cause 미해결)

### 검증 기준
- 차기 5+ Sprint 연속 정상 추출 = lifecycle 정착 1차 확증
- 1회라도 재발 시 즉시 SPEC.md awk validation을 PostToolUse hook 또는 pre-commit hook으로 자동화 검토
- script-level fix 후보: `scripts/spec/validate-fitem-rows.sh` (column 수 + pipe escape 자동 점검)

### 연관 패턴
- F643 fix (S351, `.sprint-context` stale 영구 차단) — 동일 sprint() 함수의 별 silent layer
- `~/.claude/rules/development-workflow.md` `## Sprint stale .sprint-context / signal F_ITEMS 패턴` (17회 재현 → S351 영구 차단)
- `~/.claude/rules/memory-lifecycle.md` (lifecycle 승격 조건 A: 2회+ 관찰)
