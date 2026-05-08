---
code: FX-DESIGN-370
title: Sprint 370 — F635 content-sync-check.sh ✅ false positive fix
version: 1.0
status: Active
category: DESIGN
created: 2026-05-08
updated: 2026-05-08
sprint: 370
f_item: F635
req: FX-REQ-700
---

# Sprint 370 Design — F635 content-sync-check.sh ✅ false positive fix

> 구현 상세는 Plan(`sprint-370.plan.md`) §3~§4에 코드 명세까지 포함. 본 문서는 SDD Triangle 동기화용.

## §1 문제 정의

`scripts/content-sync-check.sh`의 SPRINT/PHASE 추출 로직이 `grep '✅'`로 전체 행을 스캔해
description 컬럼에 다른 F-item ✅ 참조가 있는 `📋(plan)` 행도 매칭. False positive 8건 확인.

## §2 설계 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 매칭 방식 | `awk -F'\|' '$5 ~ /✅/'` | `|`로 분리한 5번째 컬럼(status)만 정확 매칭 |
| PHASE fallback | 동일 awk 패턴 적용 | 대칭성 + 동일 silent layer 잔존 차단 |
| 회귀 테스트 | Scenario E 추가 | description ✅ 참조 + 📋 status = exit 0 검증 |

## §3 파일 매핑

| 파일 | 변경 | 내용 |
|------|------|------|
| `scripts/content-sync-check.sh` | 수정 | line 33 + line 39 awk-based 매칭 (2 line) |
| `scripts/__tests__/test-content-sync-check.sh` | 수정 | Scenario E 추가 (~35 line) |

## §4 테스트 계약 (TDD)

`bash scripts/__tests__/test-content-sync-check.sh` — 5 시나리오, 7 assertion:
- A: ✅ max Sprint 정상 추출
- B: drift 감지 exit 1
- C: ✅ 없음 graceful skip
- D: mixed ✅/📋 → ✅ max wins
- **E (신규)**: 📋 row description ✅ 참조 → false positive 회피

## §5 Phase Exit Criteria 요약

P-a~P-h (Plan §5 참조). 핵심:
- `grep '✅'` 잔존 0건 (P-b)
- 5 시나리오 전체 PASS (P-d)
- typecheck/lint 회귀 0 (P-f) — sh 파일이므로 pnpm scope 무관
