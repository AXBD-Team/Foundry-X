# Sprint 404 Plan — F670 ax-harness-kit Phase 3

## F-item
F670 (FX-REQ-732, P1) — ax-harness-kit Phase 3: `.claude/settings.json` hooks 4종 옵트인

## 목표
M7 (Claude hooks) 옵트인 구현. 신규 프로젝트가 `--with-claude-hooks` 플래그로
PreToolUse + PostToolUse + SessionStart + UserPromptSubmit 4 hook을 선택 설치.
Foundry-X 경로 zero (전부 `$CLAUDE_PROJECT_DIR` 상대 경로).
Foundry-X drift 수동 모니터 스크립트 제공.

## 의존성
- F666 ✅ (generateMonorepoScaffold + walkTemplates 패턴)
- F667 ✅ (wrangler.toml env 분리)
- F668 ✅ (monorepo/.claude/rules/ 9종)
- F669 ✅ (opt-in 3 플래그: bashrc-patch / tmux-patch / scripts)

## 범위 (SCOPE LOCKED)

### (a) `MonorepoScaffoldOptions` 타입 확장 (`types.ts`)
`withClaudeHooks?: boolean` — M7 주석 포함

### (b) `generateMonorepoScaffold` 조건부 opt-in 처리 (`scaffold/generator.ts`)
`templates/opt-in/claude-hooks/` → F669 동일 walkTemplates 패턴

### (c) 템플릿 — `.claude/settings.json.hbs`
- 4 hook 타입: PreToolUse(2) + PostToolUse(5) + SessionStart(1) + UserPromptSubmit(1)
- 모든 경로: `$CLAUDE_PROJECT_DIR` 상대 (hardcoded `/home/sinclair` 0건)
- Foundry-X literal 0건

### (d) hook 스크립트 5종
- `.claude/hooks/pre-bash-guard.sh` — git 위험 명령 차단
- `.claude/hooks/post-edit-format.sh` — eslint --fix
- `.claude/hooks/post-edit-typecheck.sh` — tsc --noEmit filter
- `.claude/hooks/post-edit-test-warn.sh` — 테스트 파일 부재 경고
- `scripts/task/heartbeat-hook.sh` — .task-context 갱신

### (e) drift check 스크립트
- `scripts/setup/check-harness-drift.sh.hbs` — `{{projectName}}` 변수 치환
- reference dir diff + exit code (CI 통합 가능)

### Out-of-scope
- `--with-scripts` 플래그 내부 sprint-notification-surface.sh (F669 scope)
- SessionStart global scripts (~/scripts/) — 개인 환경 의존적
- CLI `create` 커맨드 인자 추가 (별도 F-item)

## TDD 계획
- Red: T24~T28 FAIL 확인 → Green: 파일 생성 후 28/28 PASS

## Smoke Reality (DoD)
- P-a: `withClaudeHooks:true` scaffold 실 실행 → 9 파일 생성 확인
- P-b: settings.json에 4 hook 타입 존재 확인
- P-c: `$CLAUDE_PROJECT_DIR` 경로 사용 + Foundry-X literal 0건 확인
- P-d: T24~T28 vitest 28/28 PASS (turbo --force)
- P-e: typecheck PASS (tsc --noEmit cache 우회)
