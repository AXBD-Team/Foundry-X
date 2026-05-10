# Sprint 380 Design — F643 bashrc sprint() L1 fix

> **Sprint**: 380 | **F-item**: F643 | **REQ**: FX-REQ-708 | **Priority**: P2
> **Date**: 2026-05-10 | **Session**: S351

## 1. 개요

`~/.bashrc sprint()` 함수의 3가지 결함을 patch draft + 회귀 테스트로 차단한다.
Cross-repo dual-track: Foundry-X repo는 테스트/패치/문서만 담고, 실제 bash 파일은 Master post-merge 수동 적용.

## 2. 변경 대상 분석

### 2-1. ~/.bashrc sprint() 함수 (외부 수동 적용)

**위치**: `~/.bashrc:355`  
**생성 파일**: `reports/sprint-380-bashrc-patch.diff` (통합 diff 형식)

#### Fix A — awk 정확 매칭 (L398 대상)

```diff
-      f_items=$(awk -F'|' -v s="Sprint ${num}" '$4 ~ s {match($2,/F[0-9]+/); print substr($2,RSTART,RLENGTH)}' SPEC.md 2>/dev/null | paste -sd, -)
+      f_items=$(awk -F'|' -v s="Sprint ${num}" '{
+        col4=$4; gsub(/^[[:space:]]+|[[:space:]]+$/,"",col4)
+        if (col4 == s) { match($2,/F[0-9]+/); if(RSTART) print substr($2,RSTART,RLENGTH) }
+      }' SPEC.md 2>/dev/null | paste -sd, -)
```

**이유**: `$4 ~ s`는 substring match → "Sprint 3800"이 "Sprint 380" 패턴에 매칭됨.
trim + `==` 비교로 exact column 매칭 강제.

#### Fix B — `.sprint-context` SPRINT_NUM 검증 (L393-395 대상)

```diff
-    if [ -f "$wt_dir/.sprint-context" ]; then
-      f_items=$(grep "^F_ITEMS=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
-    fi
+    if [ -f "$wt_dir/.sprint-context" ]; then
+      local ctx_num
+      ctx_num=$(grep "^SPRINT_NUM=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
+      if [ "$ctx_num" = "$num" ]; then
+        f_items=$(grep "^F_ITEMS=" "$wt_dir/.sprint-context" 2>/dev/null | cut -d= -f2)
+      else
+        echo "⚠️ [sprint-ctx-drift] SPRINT_NUM=${ctx_num} != ${num} — SPEC.md 재추출 (S380 F643 fix)" >&2
+      fi
+    fi
```

**이유**: `.sprint-context` 파일이 stale sprint 데이터를 담고 있어도 SPRINT_NUM 불일치면 사용 거부.

#### Fix C — signal 생성 drift 검출 + force overwrite (L452-477 대상)

```diff
-    if [ ! -f "$sig_file" ]; then
+    local _sig_needs_create=true
+    if [ -f "$sig_file" ]; then
+      local _sig_num _sig_fitems
+      _sig_num=$(grep "^SPRINT_NUM=" "$sig_file" 2>/dev/null | cut -d= -f2)
+      _sig_fitems=$(grep "^F_ITEMS=" "$sig_file" 2>/dev/null | cut -d= -f2)
+      if [ "$_sig_num" = "$num" ] && { [ -z "$f_items" ] || [ "$_sig_fitems" = "$f_items" ]; }; then
+        echo "📡 Signal 존재 (검증 OK): ${sig_file}"
+        _sig_needs_create=false
+      else
+        echo "⚠️ [signal-drift] SPRINT_NUM=${_sig_num}→${num} F_ITEMS=${_sig_fitems}→${f_items} — force overwrite (S380 F643 fix)" >&2
+      fi
+    fi
+    if $_sig_needs_create; then
       ... (signal creation body)
-    else
-      echo "📡 Signal 이미 존재: ${sig_file}"
-    fi
+    fi
```

**이유**: 기존 `[ ! -f ]` 조건은 stale signal 잔존 시 검증 없이 skip. drift 감지 후 force overwrite.

### 2-2. 회귀 테스트 스크립트 (Foundry-X 내부)

**파일**: `scripts/__tests__/test-sprint-fitems.sh`

테스트 구조:
- 임시 디렉토리에 mock SPEC.md + mock .sprint-context 생성
- 수정된 bashrc awk 패턴을 직접 실행
- 4가지 시나리오 검증

```bash
#!/usr/bin/env bash
# F643: bashrc sprint() awk/ctx/signal L1 fix 회귀 테스트

set -euo pipefail

PASS=0; FAIL=0
_assert() { ... }

# T1: 정상 awk 추출
# T2: .sprint-context SPRINT_NUM 불일치 감지
# T3: Signal drift 감지
# T4: awk 경계 — Sprint 38 패턴이 Sprint 380 미매칭
```

### 2-3. bashrc 패치 Draft

**파일**: `reports/sprint-380-bashrc-patch.diff`

unified diff 형식, context 3줄, `~/.bashrc` 기준 L355 sprint() 함수 범위만 포함.
`patch -p0 < sprint-380-bashrc-patch.diff` 로 적용 가능.

## 3. 파일 매핑 (§5 기준)

| # | 파일 | 액션 | 비고 |
|---|------|------|------|
| 1 | `docs/01-plan/features/sprint-380.plan.md` | CREATE | ✅ 완료 |
| 2 | `docs/02-design/features/sprint-380.design.md` | CREATE | 현재 파일 |
| 3 | `scripts/__tests__/test-sprint-fitems.sh` | CREATE | 회귀 테스트 4시나리오 |
| 4 | `reports/sprint-380-bashrc-patch.diff` | CREATE | ~/.bashrc patch draft |

## 4. 테스트 계약 (TDD Red Target)

### T1: 정상 awk 추출
- Input: SPEC.md에 "Sprint 380" row + F643 등록
- Expected: `f_items = "F643"` 정확 추출

### T2: `.sprint-context` drift 감지
- Input: `.sprint-context`에 `SPRINT_NUM=379`, `F_ITEMS=F642`
- Expected: stderr에 "[sprint-ctx-drift]" 포함, f_items = SPEC.md 값 사용

### T3: signal drift 감지
- Input: `/tmp/sprint-signals/mock-380.signal`에 `SPRINT_NUM=379`, `F_ITEMS=F642`
- Expected: stderr에 "[signal-drift]" 포함, signal force overwrite

### T4: awk 경계 — substring 미매칭
- Input: SPEC.md에 "Sprint 3800" row + F999
- Tested num: 380
- Expected: F999 미추출 (exact match이므로)

## 5. 비기능 요구사항

- 패치 적용 후 기존 `sprint()` 기능 100% 동일 동작 (외부 동작 변화 없음)
- 경고 메시지는 stderr 출력 (stdout 오염 방지)
- 테스트 스크립트 독립 실행 가능 (CI 의존성 없음)

## 6. 적용 순서 (Master post-merge)

```bash
# 1. patch 적용
patch -p0 < reports/sprint-380-bashrc-patch.diff

# 2. 검증
source ~/.bashrc
bash scripts/__tests__/test-sprint-fitems.sh

# 3. 실 Sprint 시동 (Sprint 381)
# → signal + .sprint-context 양쪽 SPRINT_NUM=381 + F_ITEMS= 신규 값 확인
```
