# Sprint 404 Report — F670 ax-harness-kit Phase 3

## Summary
- **F-item**: F670 (FX-REQ-732, P1)
- **Sprint**: 404
- **Branch**: sprint/404
- **Match Rate**: 100%
- **Tests**: 89/89 PASS (28/28 monorepo, +5 T24~T28 신규)
- **Typecheck**: PASS (tsc --noEmit, turbo --force cache 우회)

## 구현 내용

### (a) 타입 확장
`MonorepoScaffoldOptions`에 `withClaudeHooks?: boolean` 추가 (F670 M7 opt-in).
F666~F669 패턴 일관성 유지.

### (b) 생성기 확장
`generateMonorepoScaffold`에 `withClaudeHooks` 조건부 블록 추가.
F669 bashrc-patch/tmux-patch/scripts와 동일 walkTemplates 패턴.

### (c) settings.json.hbs — 4 hook 타입 전부 포함
| Hook | Matchers | 핵심 동작 |
|------|----------|----------|
| PreToolUse | Edit\|Write, Bash | 보호 파일 차단 + git 위험 명령 차단 |
| PostToolUse | `*`, Edit\|Write | heartbeat + eslint + typecheck + test-warn |
| SessionStart | (전체) | git-orphan-scan --quiet |
| UserPromptSubmit | (전체) | sprint-notification-surface |

모든 경로: `$CLAUDE_PROJECT_DIR` 상대 → Foundry-X literal 0건 (T26 검증).

### (d) hook 스크립트 5종
기존 Foundry-X `.claude/hooks/` 4개 + `scripts/task/heartbeat-hook.sh` 복사.
모두 프로젝트 중립적 (개인 경로 0건).

### (e) drift check 스크립트
`check-harness-drift.sh.hbs` — `{{projectName}}` 치환, reference diff + exit code.
월 1회 또는 Sprint 종료 시 `bash scripts/setup/check-harness-drift.sh <ref-dir>` 실행.

## TDD 결과
- Red: T24/T25/T26/T28 FAIL, T27 PASS (4 FAIL = 정상 Red)
- Green: 28/28 PASS (4 F669 flag patterns + 5 F670 새 테스트)
- Red commit: `c51ec2f3`, Green commit: `3ff4399d`

## Gap Analysis
Match Rate: **100%** (gap-detector 정적 분석 기준)

| 요구사항 | 상태 |
|----------|:----:|
| 타입 확장 (`withClaudeHooks`) | ✅ |
| 생성기 opt-in 블록 | ✅ |
| settings.json.hbs 4 hook 타입 | ✅ |
| hook 스크립트 5종 | ✅ |
| drift check 스크립트 | ✅ |
| 테스트 T24~T28 | ✅ |

## 메타 학습

1. **F669 패턴 3회차 적용** — withClaudeHooks가 withBashrcPatch/withTmuxPatch/withScripts와 완전히 동일한 패턴으로 구현됨. F670은 walkTemplates에 1줄 + template 디렉토리 추가가 전부. 재사용성 높음.

2. **settings.json graceful fallback** — heartbeat/git-orphan/sprint-notification 스크립트는 `withScripts` flag 없이도 `|| true`로 graceful skip. hook 간 의존성 0.

3. **plain copy vs .hbs** — hook shell scripts는 변수 치환 불필요 → plain copy (확장자 없음). settings.json과 drift-check만 `.hbs` 처리 (각각 경로가 generic / projectName 치환 필요).

4. **T6 재통과 확인** — `Foundry-X` 식별자 체크 테스트가 새 template 추가 후에도 통과 (template 전체 0건).
