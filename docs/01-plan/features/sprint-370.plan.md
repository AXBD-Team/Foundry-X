---
code: FX-PLAN-370
title: Sprint 370 — F635 content-sync-check.sh ✅ false positive fix (S336 silent layer 6)
version: 1.0
status: Active
category: PLAN
created: 2026-05-08
updated: 2026-05-08
sprint: 370
f_item: F635
req: FX-REQ-700
priority: P3
---

# Sprint 370 — F635 content-sync-check.sh ✅ false positive fix

> SPEC.md §5 F635 row가 권위 소스. 본 plan은 F634(Sprint 369, ESLint base config 확장) follow-up + S336 silent layer 6 영구 해소.

## §1 배경 + 사전 측정

### 동기

S336에서 식별된 silent fail 6 layer 중 **layer 6** — `scripts/content-sync-check.sh`의 SPRINT/PHASE 추출 패턴 `grep '✅'`이 단순 텍스트 매칭이라 SPEC.md §5 F-item table의 **description 컬럼**에 등장하는 다른 F-item ✅ 참조까지 매칭한다. SPEC.md F-item row 형식:

```
| F634 | description ... F633(Sprint 368 ✅, packages/eslint-config 신설) ... | Sprint 369 | 📋(plan) | notes |
```

description 컬럼에 다른 F-item ✅ 참조가 있는 경우 (status가 📋(plan)인데도) ✅ 매칭으로 분류 → SPRINT/PHASE 추출에 잘못 포함되어 expected 값이 false positive로 오염.

### 사전 측정 (S339, 2026-05-08)

현재 SPEC.md (master @ `53b52638`):

| 측정 | 명령 | 결과 |
|------|------|------|
| 전체 F-item rows | `grep -cE '^\| F[0-9]' SPEC.md` | **138** |
| Loose `grep '✅'` 매칭 | 현재 동작 | **130** rows |
| Precise `awk -F'\|' '$5 ~ /✅/'` | 정확한 동작 | **122** rows |
| **False positive** | 차이 | **8** rows |

확인된 false positive 사례:
- **F634** (status `📋(plan)` 였음, 본 sprint commit 이전): description에 "F633(Sprint 368 ✅, packages/eslint-config 패키지 신설)" → loose 매칭 → SPRINT 369 잘못 추출
- **F633** (status `📋(plan)` 였음, 본 sprint commit 이전): description "다음 사이클 후보 F633 ✅..." → loose 매칭
- **F627** (status `📋(plan)`): description "F614 ✅, F596 ✅" 다수 → 잘못 매칭
- 그 외 5건

결과 비교 (본 sprint commit 이전 master 시점):
- Loose: SPRINT=**369** (false positive — F634 row description의 ✅ 참조)
- Precise: SPRINT=**367** (correct — 마지막 status=✅ row의 Sprint)

### 영향

- session-end Phase 0c-3 / daily-check Step 6c가 false positive expected 값으로 drift 비교
- 결과: 잘못된 drift 보고 발생 또는 진짜 drift 미검출 가능
- **30+ 세션 동안 silent로 진행** (S336까지 layer 5 fix 완료, layer 6은 deferred)

## §2 인터뷰 3회 패턴 (S339)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 fix 방식 | **`awk -F'\|' '$5 ~ /✅/'` column-based** | 5번째 column이 status (`\| FN \| desc \| Sprint N \| ✅ \| notes \|` 형식). awk POSIX 호환 + macOS/Linux 양립. sed/perl 대비 직관적 |
| 2차 PHASE fallback도 동일 적용 | line 39 PHASE_NUM fallback도 `grep '✅'` 사용 | 대칭성 유지 + 같은 silent layer 잔존 차단 |
| 3차 회귀 테스트 추가 | Scenario E (false positive 회귀) | description에 ✅ 참조 있는 📋 row가 status로 잘못 매칭 안 됨을 fixture로 검증 |

## §3 범위

### Fix scope

**(a)** `scripts/content-sync-check.sh` line 33 — SPRINT 추출:

```bash
# Before
SPRINT=$(grep -E '^\| F[0-9]' "$SPEC" | grep '✅' | grep -oP 'Sprint \K\d+' | sort -n | tail -1)

# After
SPRINT=$(awk -F'|' '/^\| F[0-9]/ && $5 ~ /✅/' "$SPEC" | grep -oP 'Sprint \K\d+' | sort -n | tail -1)
```

**(b)** `scripts/content-sync-check.sh` line 39 — PHASE_NUM fallback:

```bash
# Before
PHASE_NUM=$(grep -E '^\| F[0-9]' "$SPEC" | grep '✅' | grep -oP 'Phase \K\d+' | sort -n | tail -1)

# After
PHASE_NUM=$(awk -F'|' '/^\| F[0-9]/ && $5 ~ /✅/' "$SPEC" | grep -oP 'Phase \K\d+' | sort -n | tail -1)
```

### Test scope

**(c)** `scripts/__tests__/test-content-sync-check.sh`에 Scenario E 추가:

```bash
# ────────────────────────────────────────────────
# Scenario E: ✅ row + 📋 row(description에 ✅ 참조 있음)
#   → expected = ✅ row의 SPRINT만, false positive 회피
# ────────────────────────────────────────────────
echo ""
echo "Scenario E: 📋 row description에 ✅ 참조 있음 → false positive 회피"
TMPDIR_E=$(make_fixture_dir)

make_spec "$TMPDIR_E" <<'SPEC_EOF'
# SPEC

> **마지막 실측** (Sprint 313, 2026-04-21): ~11 routes — Phase 45 달성.

## §5 F-items

| FN | 설명 | Sprint | 상태 | 비고 |
|----|------|--------|------|------|
| F562 | shared-contracts (FX-REQ-605, P0) | Sprint 313 | ✅ | PR #656 MERGED |
| F634 | follow-up of F633(Sprint 368 ✅, packages/eslint-config 신설) | Sprint 369 | 📋(plan) | plan 작성 완료 |
SPEC_EOF

make_hero "$TMPDIR_E" "313" "45"
make_landing "$TMPDIR_E" "313" "45"
make_footer "$TMPDIR_E" "313" "45"
make_readme "$TMPDIR_E" "313" "45"

# 정확한 fix 적용 시 expected SPRINT=313 (F562만), drift 없음 → exit 0
ACTUAL_EXIT_E=$(run_check_exit "$TMPDIR_E" || true)

if [ "$ACTUAL_EXIT_E" = "0" ]; then
  pass "Scenario E: false positive 회피 (📋 row description ✅ 참조 무시)"
else
  OUTPUT_E=$(run_check "$TMPDIR_E" || true)
  fail "Scenario E: exit $ACTUAL_EXIT_E (expected 0). output: $OUTPUT_E"
fi

rm -rf "$TMPDIR_E"
```

### 검증

**(d)** Master 독립 검증 (Sprint 시동 전 baseline + Sprint 종료 후 비교):

```bash
# Before fix (loose) — 본 sprint commit 이전 시점
grep -E '^\| F[0-9]' SPEC.md | grep '✅' | grep -oP 'Sprint \K\d+' | sort -n | tail -1

# After fix (precise) — sprint 370 적용 후
awk -F'|' '/^\| F[0-9]/ && $5 ~ /✅/' SPEC.md | grep -oP 'Sprint \K\d+' | sort -n | tail -1
```

**(e)** test-content-sync-check.sh A~E 5 시나리오 모두 PASS (`bash scripts/__tests__/test-content-sync-check.sh` exit 0).

## §4 파일 매핑

| 작업 | 파일 | 변경 |
|------|------|------|
| 수정 | `scripts/content-sync-check.sh` | line 33 + line 39 awk-based 매칭으로 변경 (2 line) |
| 수정 | `scripts/__tests__/test-content-sync-check.sh` | Scenario E 추가 (~50 line) |

총 변경: **2 file**. 약 +50 / -2 LOC.

## §5 Phase Exit Criteria (P-a~P-h)

| # | 항목 | 검증 |
|---|------|------|
| P-a | content-sync-check.sh awk-based 매칭 ≥ 2건(line 33+39) | `grep -cE "awk -F'\|'.*F\[0-9\].*\\\$5 ~ /✅/" scripts/content-sync-check.sh` ≥ 2 |
| P-b | `grep '✅'` 단순 매칭 잔존 0건 | `grep -c "grep '✅'" scripts/content-sync-check.sh` = 0 |
| P-c | Scenario E 테스트 추가 | `grep -c "Scenario E" scripts/__tests__/test-content-sync-check.sh` ≥ 1 |
| P-d | test-content-sync-check.sh A~E 5/5 PASS | `bash scripts/__tests__/test-content-sync-check.sh` exit 0, output에 "PASS=10" 또는 그 이상 (시나리오당 2 assertion) |
| P-e | 본 fix 적용 후 SPEC.md precise SPRINT 추출 정확 | `awk -F'\|' '/^\| F[0-9]/ && $5 ~ /✅/' SPEC.md \| grep -oP 'Sprint \K\d+' \| sort -n \| tail -1` 결과 = SSOT |
| P-f | typecheck + lint 회귀 0 | `pnpm turbo run lint typecheck --force` exit 0 (sh 파일이라 lint script 무영향) |
| P-g | dual_ai_reviews sprint 370 자동 INSERT ≥ 1건 | D1 쿼리, hook 35 sprint 연속 정상 |
| P-h | session-end Phase 0c-3 + daily-check Step 6c 정상 동작 | content-sync-check 실행 시 false positive 0 (실제 master 시점 expected = precise 값과 일치) |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| awk POSIX 호환성 — macOS / Linux awk 차이 | `awk -F'\|'` + `$5 ~ /pattern/`은 모두 POSIX 표준. WSL Ubuntu 24.04에서 검증 |
| ✅ UTF-8 emoji byte-level — awk locale 영향 | `awk` UTF-8 환경 정상 동작. 회귀 테스트 5/5 PASS 시 안전. 안되면 `LC_ALL=C.UTF-8` 명시 |
| Scenario E fixture가 실제 SPEC.md 패턴 정확 반영 못할 가능성 | description에 "F633(Sprint 368 ✅, ...)" 등 실제 패턴 그대로 fixture에 포함 |
| line 33/39 외 다른 곳에서도 동일 안티패턴 — 차단 누락 가능 | P-b로 잔존 0건 확인. 추가로 다른 sh script(`/scripts/`)도 grep로 안티패턴 확장 검색 (사전 측정) |
| Status 컬럼이 `✅(deployed)` 같은 변형이면 awk 매칭에 포함되는지 | `~ /✅/` regex match라 부분 매칭 OK. `✅`, `✅(deployed)`, `✅ ` (공백 포함) 모두 매칭 |

## §7 다음 사이클 후보 (out of scope)

1. `.ts` source + tests를 packages/eslint-config로 이전 (S338 deferred)
2. `@hono/zod-openapi 0.18+` 버전업 (S336 silent layer 4 견고화)
3. ESLint base config TypeScript 타입 export (`Linter.FlatConfig[]`)
4. 추가 silent fail layer 발견 시 패턴 일반화

## §8 시동

- master 직접 commit + push (meta-only: SPEC + plan)
- `bash -i -c "sprint 370"` Sprint WT 시동
- autopilot pipeline (plan → design → impl → verify → gap → report → PR)
- Stale F_ITEMS 패턴 8회차 재현 가능성 — 시동 후 signal/.sprint-context 보정 필요시 즉시 fix
