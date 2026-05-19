# Sprint 403 Report — F669 ax-harness-kit Tier 2-B

> **Sprint**: 403 | **F-item**: F669 | **Match Rate**: 100% | **Status**: ✅ DONE  
> **날짜**: 2026-05-19 | **담당**: Sinclair Seo

---

## §1. 요약

`packages/harness-kit` monorepo scaffold에 3개 opt-in 플래그를 추가했다.
`--with-bashrc-patch`, `--with-tmux-patch`, `--with-scripts` 중 필요한 것만 선택적으로 활성화한다.

- **M9 bashrc patch**: 13 Sprint workflow 함수를 `~/.bashrc`에 idempotent 주입하는 스크립트
- **S3 tmux patch**: TPM + tmux-resurrect + tmux-continuum 5단계 설치 스크립트
- **M10 scripts/task**: task-daemon.sh.hbs + lib.sh.hbs + 3 plain scripts (sprint-merge-monitor, git-orphan-scan, git-orphan-clean)

---

## §2. 구현 내역

### 신규 파일 (7개)
| 파일 | 타입 | 설명 |
|------|------|------|
| `opt-in/bashrc-patch/scripts/setup/patch-bashrc.sh.hbs` | HBS | 13함수 BEGIN/END 마커 idempotent 패치 |
| `opt-in/tmux-patch/scripts/setup/patch-tmux.sh.hbs` | HBS | TPM+resurrect+continuum 5단계 |
| `opt-in/scripts/scripts/task/task-daemon.sh.hbs` | HBS | githubOrg/githubRepo 변수화 |
| `opt-in/scripts/scripts/task/lib.sh.hbs` | HBS | FX_HOME projectName 변수화 |
| `opt-in/scripts/scripts/task/sprint-merge-monitor.sh` | plain | 그대로 복사 |
| `opt-in/scripts/scripts/task/git-orphan-scan.sh` | plain | 그대로 복사 |
| `opt-in/scripts/scripts/task/git-orphan-clean.sh` | plain | 그대로 복사 |

### 수정 파일 (4개)
| 파일 | 변경 내용 |
|------|----------|
| `types.ts` | `MonorepoScaffoldOptions`에 `withBashrcPatch?`, `withTmuxPatch?`, `withScripts?` 추가 |
| `generator.ts` | `OPT_IN_DIR` 상수 + 3 조건부 `walkTemplates` 블록 |
| `init-monorepo.ts` | `--with-bashrc-patch`, `--with-tmux-patch`, `--with-scripts` CLI 플래그 3개 |
| `monorepo.test.ts` | T15~T23 9 테스트 추가 |

---

## §3. 테스트 결과

| 테스트 | 결과 |
|--------|------|
| T1~T14 (F666~F668 기존) | ✅ PASS (회귀 없음) |
| T15: `withBashrcPatch:true` → patch-bashrc.sh 존재 | ✅ PASS |
| T16: BEGIN/END 마커 + 13 함수명 포함 | ✅ PASS |
| T17: AX_TARGET_HOME + getent passwd 포함 | ✅ PASS |
| T18: `withTmuxPatch:true` → patch-tmux.sh 존재 | ✅ PASS |
| T19: `withScripts:true` → scripts/task/ 5 파일 존재 | ✅ PASS |
| T20: task-daemon.sh에 `KTDS-AXBD/Foundry-X` literal 없음 | ✅ PASS |
| T21: lib.sh에 `~/.foundry-x` literal 없음 | ✅ PASS |
| T22: 플래그 미전달 시 opt-in 파일 미생성 | ✅ PASS |
| T23: patch-bashrc.sh executable (0o755) | ✅ PASS |
| **합계** | **84/84** |

---

## §4. 이슈 및 해결

### Handlebars `}}}` CLOSE_UNESCAPED 충돌

**현상**: `lib.sh.hbs` 라인 `FX_HOME="${FX_HOME:-/home/sinclair/.{{projectName}}}"` 처리 시
Handlebars 파서가 `{{projectName}}}` 를 `CLOSE_UNESCAPED` 토큰으로 인식하여 parse error 발생.

**원인**: Handlebars는 `}}}` 를 triple-stash close 토큰 `{{{...}}}` 의 닫기로 그리디 매칭.
bash `${VAR:-default}` 안에 `{{HBS_EXPR}}` 를 직접 사용하면 `}}` + `}` → `}}}` 충돌.

**해결**: 중간 변수 분리:
```bash
_AX_PROJECT_NAME="{{projectName}}"
FX_HOME="${FX_HOME:-/home/sinclair/.$_AX_PROJECT_NAME}"
```

---

## §5. Gap Analysis

Design §5 파일 매핑 기준 대조:

| 항목 | 설계 | 구현 | 일치 |
|------|------|------|------|
| patch-bashrc.sh.hbs | ✅ | ✅ | ✅ |
| patch-tmux.sh.hbs | ✅ | ✅ | ✅ |
| task-daemon.sh.hbs | ✅ | ✅ | ✅ |
| lib.sh.hbs | ✅ | ✅ | ✅ |
| sprint-merge-monitor.sh | ✅ | ✅ | ✅ |
| git-orphan-scan.sh | ✅ | ✅ | ✅ |
| git-orphan-clean.sh | ✅ | ✅ | ✅ |
| types.ts 3 flags | ✅ | ✅ | ✅ |
| generator.ts opt-in | ✅ | ✅ | ✅ |
| init-monorepo.ts flags | ✅ | ✅ | ✅ |
| T15~T23 tests | ✅ | ✅ | ✅ |

**Match Rate: 100%**
