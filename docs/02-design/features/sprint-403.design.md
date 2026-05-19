# Sprint 403 Design — F669 ax-harness-kit Tier 2-B

## 아키텍처 결정

### opt-in 디렉토리 패턴
F666/F668와 동일한 `walkTemplates` 패턴 재사용.
`templates/opt-in/{bashrc-patch|tmux-patch|scripts}/` 각각 독립 서브디렉토리.
플래그 활성화 시에만 `walkTemplates`로 처리 → 기존 base 템플릿 무영향.

### task-daemon.sh 템플릿화 전략
1371줄 전체를 HBS로 변환하지 않음.
Foundry-X 고유 참조만 `{{}}` 치환:
- `"KTDS-AXBD/Foundry-X"` → `"{{githubOrg}}/{{githubRepo}}"` (8곳)
- `github.com/KTDS-AXBD/Foundry-X` → `github.com/{{githubOrg}}/{{githubRepo}}` (2곳)

lib.sh은 FX_HOME path만 치환:
- `~/.foundry-x` → `~/.{{projectName}}`

### patch-bashrc.sh 설계
- AX_TARGET_HOME 감지 (install-tmux-hooks.sh 동일 패턴)
- `# ax-harness BEGIN/END` markers로 idempotent 업데이트
- 13 함수 블록을 heredoc으로 포함
- WSL-specific 경로는 env var fallback 패턴 (`${WTE:-}`)

### patch-tmux.sh 설계
- install-tmux-hooks.sh 로직 흡수 (3단계: symlink + tmux.conf 주입 + reload)
- tmux-resurrect, tmux-continuum TPM 플러그인 설치 안내
- `set -eu`, TARGET_HOME 감지

## §5 파일 매핑

### 신규 파일 (생성)
| 파일 | 타입 | 설명 |
|------|------|------|
| `packages/harness-kit/src/scaffold/templates/opt-in/bashrc-patch/scripts/setup/patch-bashrc.sh.hbs` | HBS | bashrc 13함수 패치 스크립트 |
| `packages/harness-kit/src/scaffold/templates/opt-in/tmux-patch/scripts/setup/patch-tmux.sh.hbs` | HBS | tmux + resurrect 설치 스크립트 |
| `packages/harness-kit/src/scaffold/templates/opt-in/scripts/scripts/task/task-daemon.sh.hbs` | HBS | task-daemon 변수화 |
| `packages/harness-kit/src/scaffold/templates/opt-in/scripts/scripts/task/lib.sh.hbs` | HBS | lib.sh FX_HOME 변수화 |
| `packages/harness-kit/src/scaffold/templates/opt-in/scripts/scripts/task/sprint-merge-monitor.sh` | plain | 그대로 복사 |
| `packages/harness-kit/src/scaffold/templates/opt-in/scripts/scripts/task/git-orphan-scan.sh` | plain | 그대로 복사 |
| `packages/harness-kit/src/scaffold/templates/opt-in/scripts/scripts/task/git-orphan-clean.sh` | plain | 그대로 복사 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `packages/harness-kit/src/types.ts` | MonorepoScaffoldOptions에 3 opt-in 플래그 추가 |
| `packages/harness-kit/src/scaffold/generator.ts` | generateMonorepoScaffold opt-in 처리 추가 |
| `packages/harness-kit/src/cli/init-monorepo.ts` | 3 CLI 플래그 추가 |
| `packages/harness-kit/__tests__/scaffold/monorepo.test.ts` | T15~T23 추가 |

## 테스트 계약 (TDD Red Target)

```
T15: withBashrcPatch:true → scripts/setup/patch-bashrc.sh 존재
T16: patch-bashrc.sh 내용에 '# ax-harness BEGIN', '# ax-harness END', 13 함수명 포함
T17: patch-bashrc.sh에 AX_TARGET_HOME 패턴 포함
T18: withTmuxPatch:true → scripts/setup/patch-tmux.sh 존재
T19: withScripts:true → scripts/task/ 4 파일 (task-daemon.sh, lib.sh, sprint-merge-monitor.sh, git-orphan-scan.sh, git-orphan-clean.sh) 존재
T20: task-daemon.sh에 'KTDS-AXBD/Foundry-X' literal 없음
T21: lib.sh에 '~/.foundry-x' literal 없음 (FX_HOME 동적)
T22: 플래그 미전달 시 opt-in 파일 미생성 (patch-bashrc.sh, patch-tmux.sh, task-daemon.sh 모두 부재)
T23: patch-bashrc.sh가 executable(0o755)
```
