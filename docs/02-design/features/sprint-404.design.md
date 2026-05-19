# Sprint 404 Design — F670 ax-harness-kit Phase 3

## F-item
F670 (FX-REQ-732, P1) — Claude hooks 4종 옵트인

## 아키텍처 결정

### opt-in 디렉토리 구조
F669 패턴 그대로 적용:
```
templates/opt-in/claude-hooks/
  .claude/
    settings.json.hbs      → .claude/settings.json
    hooks/
      pre-bash-guard.sh    (plain copy)
      post-edit-format.sh  (plain copy)
      post-edit-typecheck.sh (plain copy)
      post-edit-test-warn.sh (plain copy)
  scripts/
    task/
      heartbeat-hook.sh    (plain copy)
    setup/
      check-harness-drift.sh.hbs → check-harness-drift.sh
```

`walkTemplates`가 재귀로 처리:
- `.hbs` 파일 → Handlebars 컴파일 → 확장자 제거 저장
- `.sh` 파일 → `chmod 0o755` 자동 적용
- plain 파일 → copyFileSync

### settings.json.hbs Hook 설계

#### PreToolUse
1. `Edit|Write` matcher — inline inline guard: `.env|credentials|pnpm-lock.yaml` 감지 → exit 2
2. `Bash` matcher — `pre-bash-guard.sh` 위임 (git 4종 차단)

#### PostToolUse
1. `*` matcher — heartbeat (`scripts/task/heartbeat-hook.sh`) 갱신
2. `Edit|Write` matcher — 3 step:
   - `post-edit-format.sh` (eslint --fix, 15s)
   - `post-edit-typecheck.sh` (tsc --noEmit filter, 60s)
   - `post-edit-test-warn.sh` (비차단 경고, 5s)

#### SessionStart
- `git-orphan-scan.sh --quiet` — 고아 브랜치 점검 (graceful fallback `|| true`)

#### UserPromptSubmit
- `sprint-notification-surface.sh` — Sprint MERGED 알림 surface (graceful fallback)

### 경로 설계 원칙
- 모든 command: `$CLAUDE_PROJECT_DIR/...` 상대 (개인 HOME 경로 0건)
- heartbeat/git-orphan/sprint-notification: `withScripts` 없어도 `|| true` graceful skip
- Foundry-X 식별자: templates 전체 0건 (T26 검증)

### drift check 스크립트 설계
- `{{projectName}}` Handlebars 치환 → project 인식
- `sed "s/Foundry-X/${PROJECT_NAME}/g"` — 비교 전 정규화
- exit code = DRIFT_COUNT (CI gate 통합 가능)

## 파일 매핑 (§5)

| 파일 | 액션 | 비고 |
|------|------|------|
| `src/types.ts` | 수정 | `withClaudeHooks?: boolean` 추가 |
| `src/scaffold/generator.ts` | 수정 | `if (options.withClaudeHooks)` 블록 추가 |
| `templates/opt-in/claude-hooks/.claude/settings.json.hbs` | 신규 | 84L, 4 hook 타입 |
| `templates/opt-in/claude-hooks/.claude/hooks/pre-bash-guard.sh` | 신규 | FX에서 복사, generic |
| `templates/opt-in/claude-hooks/.claude/hooks/post-edit-format.sh` | 신규 | FX에서 복사, generic |
| `templates/opt-in/claude-hooks/.claude/hooks/post-edit-typecheck.sh` | 신규 | FX에서 복사, generic |
| `templates/opt-in/claude-hooks/.claude/hooks/post-edit-test-warn.sh` | 신규 | FX에서 복사, generic |
| `templates/opt-in/claude-hooks/scripts/task/heartbeat-hook.sh` | 신규 | FX에서 복사, generic |
| `templates/opt-in/claude-hooks/scripts/setup/check-harness-drift.sh.hbs` | 신규 | drift monitor |
| `__tests__/scaffold/monorepo.test.ts` | 수정 | T24~T28 5 test 추가 |

## TDD 테스트 계약

| Test | 검증 |
|------|------|
| T24 | `withClaudeHooks:true` → `.claude/settings.json` 존재 |
| T25 | 4 hook 타입 JSON keys (PreToolUse/PostToolUse/SessionStart/UserPromptSubmit) |
| T26 | `$CLAUDE_PROJECT_DIR` 포함 + `/home/sinclair`/`foundry-x`/`Foundry-X` 0건 |
| T27 | flag 미지정 → `.claude/settings.json` 미존재 |
| T28 | 4 hook scripts + heartbeat + drift check = 6 파일 존재 |
