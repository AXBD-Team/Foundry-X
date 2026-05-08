---
code: FX-RPRT-370
title: Sprint 370 — F635 content-sync-check.sh ✅ false positive fix
version: 1.0
status: Done
category: REPORT
created: 2026-05-08
sprint: 370
f_item: F635
req: FX-REQ-700
match_rate: 100
---

# Sprint 370 Report — F635

## 요약

`scripts/content-sync-check.sh`의 `grep '✅'` 단순 텍스트 매칭을 `awk -F'|' '$5 ~ /✅/'` 컬럼 기반으로 교체하여 S336에서 식별된 silent layer 6 false positive 문제를 영구 해소했다.

## 구현 내용

| 파일 | 변경 |
|------|------|
| `scripts/content-sync-check.sh` | line 33 + line 39 awk-based SPRINT/PHASE 추출 (2 line) |
| `scripts/__tests__/test-content-sync-check.sh` | Scenario E 추가 (~35 line) |
| `docs/02-design/features/sprint-370.design.md` | Design 문서 신규 |

총 변경: `+97 / -9 LOC` (4 files).

## Phase Exit 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | awk-based 매칭 ≥ 2건 | **2건 PASS** |
| P-b | `grep '✅'` 잔존 0건 | **0건 PASS** |
| P-c | Scenario E 추가 | **4 match PASS** |
| P-d | test A~E 5/5 PASS | **7 assertion PASS** |
| P-e | precise SPRINT 추출 정확 | **PASS** |
| P-f | typecheck + lint 회귀 0 | **sh 파일 — TS/JS 변경 0건 PASS** |
| P-g | dual_ai_reviews 자동 INSERT | **WARN verdict 저장 완료** |
| P-h | false positive 0 | **awk 컬럼 매칭으로 description ✅ 참조 무시** |

## Gap Analysis

- **Match Rate: 100%** (Design §3 파일 매핑 2/2 완전 구현)
- Codex verdict: **WARN** (D1~D4 PASS, FX-REQ-587~590 경고는 codex 템플릿 PRD 불일치로 무관)

## 교훈

- awk `$5 ~ /✅/` 패턴은 POSIX 표준으로 macOS/Linux 양립하며, Markdown table `|` 구분자 기반 정확 컬럼 매칭에 효과적
- S336에서 15 silent layer 중 layer 6이었으며 30+ 세션 동안 미탐지. 회귀 테스트 Scenario E로 영구 차단
- sh 파일 수정은 pnpm turbo scope 밖이므로 turbo cache 함정(S337) 무관

## 35 세션 연속 성공

S306~S339 (F560~F634) → **S340 (F635)**: Match 100% 유지.
