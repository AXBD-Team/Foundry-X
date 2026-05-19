# Sprint 407 F673 — gate-x 3rd Dogfood Report

**날짜**: 2026-05-19  
**Sprint**: 407  
**F-item**: F673 ax-harness-kit improvements I-1+I-2+I-3  
**Match Rate**: 100%  
**Duration**: ~40분  

## Phase Exit P-a~P-i 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | `--with-d1-create`, `--d1-database-id` 플래그 존재 | ✅ 2 hits in init-monorepo.ts |
| P-b | `execFileNoThrow` 사용 (shell-safe) | ✅ 5 hits in generator.ts |
| P-c | SETUP.md.hbs 섹션 ≥ 5 | ✅ 5섹션 (`## 1.`~`## 5.`) |
| P-d | `--with-git-init` + git 3단계 호출 | ✅ 9 hits in generator.ts |
| P-e | harness-kit vitest 98/98 PASS | ✅ 12 test files, 98 tests |
| P-f | SETUP.md ✅ / .git ✅ / initial commit ✅ | ✅ `a75298a chore: initial scaffold (harness-kit)` |
| P-g | wrangler.toml `<RUN:` = 0 / ID inject 3곳 | ✅ `database_id = "00000000-0000-0000-0000-000000000000"` x3 |
| P-h | scaffold file count ≥ 52 | ✅ 59 files (all flags active) |
| P-i | reports/sprint-407-dogfood-3rd-run.md | ✅ 이 파일 |

## 3rd Dogfood 실행 결과

```
scaffold: gate-x / KTDS-AXBD / gate-x
flags: --with-bashrc-patch --with-tmux-patch --with-scripts --with-claude-hooks
       --d1-database-id "00000000-..." --with-git-init --cf-account b6c06059...
output: /tmp/gate-x-dogfood-407
files: 59개 생성
```

### I-1: D1 auto-create (PASS)

- `--d1-database-id` flag로 placeholder inject: `<RUN: ...>` → `00000000-0000-0000-0000-000000000000` (3곳)
- `<SAME_DATABASE_ID_AS_ABOVE>` 교체 완료

### I-2: SETUP.md auto-generate (PASS)

- `/tmp/gate-x-dogfood-407/SETUP.md` 생성 확인
- 5개 섹션: 의존성 설치 / Cloudflare 자원 / Git 초기화 / 첫 배포 / 다음 단계
- `d1Created=false` → wrangler 수동 가이드 텍스트 표시

### I-3: git init 자동화 (PASS)

- `/tmp/gate-x-dogfood-407/.git` 생성 확인
- initial commit: `a75298a chore: initial scaffold (harness-kit)`

## 신규 유틸리티

- `packages/harness-kit/src/utils/execFileNoThrow.ts` — security hook 권고에 따라 신규 생성
  - `execFile` (shell-safe) + `promisify` wrapper
  - 구조화된 `{stdout, stderr, status}` 반환
  - `runD1Create()`, `runGitInit()` 양쪽에서 활용

## test 결과

```
Test Files  12 passed (12)
     Tests  98 passed (98)  ← 기존 93 + 신규 5 (T28~T32 F673)
  Duration  1.15s
```

## 권고 (남은 개선 사항)

- **I-4** (별 F-item): `.nvmrc` 정합성 CI 게이트 — harness-kit 빌드 시 Node 버전 검증
- **I-5** (별 F-item): harness drift check script 강화 — Foundry-X 원본 vs harness 템플릿 자동 비교
- **I-6** (관찰): `--with-d1-create` 실 CF 인증 환경 테스트 (단위 test에서는 mock으로 검증됨)
