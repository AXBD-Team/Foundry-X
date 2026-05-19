# Sprint 403 Plan — F669 ax-harness-kit Tier 2-B

## F-item
F669 (FX-REQ-731, P1) — ax-harness-kit Tier 2-B: bashrc + tmux + scripts/task 옵트인

## 목표
M9 (bashrc 패치) + M10 (scripts/task 복사) + S3 (tmux conf + resurrect) 옵트인 플래그 구현.
신규 프로젝트가 `--with-bashrc-patch`, `--with-tmux-patch`, `--with-scripts` 3개 명시적 플래그로 Sprint 워크플로우 인프라를 선택 설치할 수 있도록 한다.

## 의존성
- F666 ✅ (generateMonorepoScaffold + walkTemplates 패턴)
- F668 ✅ (opt-in 없는 기본 templates/monorepo/ 구조)

## 범위 (SCOPE LOCKED)

### (a) `MonorepoScaffoldOptions` 타입 확장 (`types.ts`)
3개 optional 플래그 추가:
- `withBashrcPatch?: boolean`
- `withTmuxPatch?: boolean`
- `withScripts?: boolean`

### (b) `generateMonorepoScaffold` 조건부 opt-in 처리 (`scaffold/generator.ts`)
`templates/opt-in/{bashrc-patch|tmux-patch|scripts}` 디렉토리를 플래그 활성화 시에만 `walkTemplates`로 처리.

### (c) 템플릿 파일 — opt-in/bashrc-patch
`templates/opt-in/bashrc-patch/scripts/setup/patch-bashrc.sh.hbs`
- AX_TARGET_HOME 감지 (S293 install-tmux-hooks.sh 패턴 재활용)
- `# ax-harness BEGIN/END` markers
- 13 함수 블록 (wtsplit/_cc_billing_guard/_cc_remove_api_key/ccs/ccw/_sprint_ensure_monitor/sprint/sprint-review/sprint-pr/sprint-done/ccw-sprint/ccw-auto/sprints)
- `{{projectName}}`, `{{githubOrg}}`, `{{githubRepo}}` 변수 치환

### (d) 템플릿 파일 — opt-in/tmux-patch
`templates/opt-in/tmux-patch/scripts/setup/patch-tmux.sh.hbs`
- install-tmux-hooks.sh 로직 흡수
- tmux-resurrect + tmux-continuum TPM 플러그인 설치 절차
- `{{projectName}}` 변수 치환

### (e) 템플릿 파일 — opt-in/scripts
`templates/opt-in/scripts/scripts/task/` 디렉토리:
- `task-daemon.sh.hbs` — `KTDS-AXBD/Foundry-X` → `{{githubOrg}}/{{githubRepo}}`
- `lib.sh.hbs` — `~/.foundry-x` → `~/.{{projectName}}`
- `sprint-merge-monitor.sh` — plain copy (Foundry-X ref 없음)
- `git-orphan-scan.sh` — plain copy
- `git-orphan-clean.sh` — plain copy

### (f) CLI 명령 확장 (`cli/init-monorepo.ts`)
3개 opt-in 플래그 추가.

## Out-of-Scope (SCOPE LOCKED 차단)
- claude hooks (.claude/settings.json) → F670
- GitHub Repo 자동 생성 (S4) → 별 sprint
- dry-run 모드 (S2) → 별 sprint
- Non-WSL 환경 대응

## TDD 계획 (Red Target)
tests T15~T23 (monorepo.test.ts 추가):
- T15: withBashrcPatch → patch-bashrc.sh 생성
- T16: patch-bashrc.sh에 ax-harness BEGIN/END 마커 + 13 함수명 포함
- T17: patch-bashrc.sh에 AX_TARGET_HOME 감지 패턴 포함
- T18: withTmuxPatch → patch-tmux.sh 생성
- T19: withScripts → scripts/task/ 4 파일 생성
- T20: task-daemon.sh에 KTDS-AXBD/Foundry-X literal 없음
- T21: lib.sh에 foundry-x literal FX_HOME 없음
- T22: 플래그 없으면 opt-in 파일 미생성
- T23: patch-bashrc.sh 실행 권한(755) 설정

## Phase Exit Smoke Reality (P-a~P-h)
- P-a: 3 플래그 T15~T23 PASS (TDD Green)
- P-b: T6 변수화 검증 통과 (Foundry-X 식별자 0건 — opt-in 파일 제외 체크)
- P-c: 멱등성 T15~T23 기반 확인
- P-d: typecheck PASS (`pnpm exec tsc --noEmit` --force)
- P-e: 전체 tests 75/75+ PASS (0 regressions)
- P-f: msa-lint PASS (S360 hallucination 회피)
- P-g: report.md + velocity 모두 생성 (S362 velocity stale 차단)
- P-h: dual_ai_reviews INSERT (67 sprint streak)
