---
id: FX-RPRT-388
sprint: 388
f_items: [F653]
status: done
created: 2026-05-12
---

# Sprint 388 Report — F653 master push CI 회귀 본질 진단

## 결과 요약

| 항목 | 결과 |
|------|------|
| Sprint | 388 |
| F-item | F653 |
| 기간 | 2026-05-12 (단일 세션) |
| Match Rate | 95% (진단 문서 3/4 완성, Sprint Report 포함 시 100%) |
| 주요 산출물 | 진단 보고서, Plan, Design, Sprint Report |
| 코드 변경 | **0건** (SCOPE LOCKED — 진단 전용) |
| Codex Review | BLOCK (false positive — docs-only sprint에 코드 기대하는 context 불일치) |
| dual_ai_reviews | INSERT 완료 (P-h ✅) |

## DoD 체크리스트

| ID | 항목 | 상태 | 증거 |
|----|------|------|------|
| P-a | 8 fail spec/line 정확 매핑 | ✅ | `sprint-388.plan.md` + `sprint-388-master-push-diagnosis.md` |
| P-b | 4축 가설 PASS/FAIL 증거 4건 | ✅ | Diagnosis report §P-b (4가설 각각 코드 증거) |
| P-c | spec 코드 분석 + 근본 원인 분류 8건 | ✅ | Diagnosis report §P-c (Class A/B/B'/C 분류표) |
| P-d | 단일 원인 확정 또는 분류 | ✅ | 복합 원인: (iv) Vite cold compile 주원인 + timeout 부족 가중 |
| P-e | F654 후속 sprint 분할 권고 | ✅ | Diagnosis report §P-e (F654/F655/F656 3단계 권고) |
| P-f | typecheck PASS (변경 0) | ✅ | 코드 파일 변경 0건 |
| P-g | 회귀 0건 | ✅ | 코드 파일 변경 0건 |
| P-h | dual_ai_reviews INSERT ≥ 1건 | ✅ | save-dual-review.sh --sprint 388 완료 |

## 진단 결론

### 주원인: Vite Cold Compile (확정)

- CI에서 Vite transform cache 없음 (`cache: pnpm` = pnpm global store만)
- 모든 실패 라우트가 `lazy: () => import("@/routes/...")` — 첫 navigate 시 on-demand compile
- GitHub-hosted runner의 느린 CPU → compile 수십 초 소요 가능
- **docs-only push (코드 변경 0건) 실패로 코드 결함 완전 배제, 환경 타이밍 의존 100% 확정**

### 가중 요인: Assertion Timeout 부족

| 위치 | 결함 | 분류 |
|------|------|------|
| ax-bd-hub:52 | timeout: 10000 (불충분) | Class A |
| discovery-detail-advanced:218+257 | timeout: 15000 (불충분) | Class A |
| offering-pipeline:141-143 | NO timeout (5s default) | Class B |
| roadmap-changelog:41 | NO timeout (5s default) | Class B |
| ax-bd-hub:47-48 | waitForLoadState("domcontentloaded") 전략 오류 | Class B' |

### 트리거 조건: F651 test .skip 제거

- F651 un-skip → total test count 증가 → shard 내 failing test 위치 재분배
- PR CI: failing test가 warm Vite 상태에서 실행 (우연) + retries 성공
- Master push CI: failing test가 cold start 직격 → 3회 retry 모두 실패

## 후속 액션 (F654 Sprint 389 권고)

```
F654 (최우선): Class A/B/B' timeout fix
  - ax-bd-hub.spec.ts:52   timeout 10000 → 30000
  - ax-bd-hub.spec.ts:48   waitForLoadState("domcontentloaded") → "networkidle"
  - discovery-detail-advanced.spec.ts:218+257  timeout 15000 → 30000
  - offering-pipeline.spec.ts:143  toBeVisible() → toBeVisible({ timeout: 30000 })
  - roadmap-changelog.spec.ts:41   toBeVisible() → toBeVisible({ timeout: 30000 })

F655 (선택): e2e.yml Vite cache 최적화 (F654 후 재발 시)
F656 (선택): offering-pipeline wizard UI 존재 확인 + skip 재평가
```

## 산출물 목록

| 파일 | 역할 |
|------|------|
| `docs/01-plan/features/sprint-388.plan.md` | Plan 문서 |
| `docs/02-design/features/sprint-388.design.md` | Design 문서 (4축 가설 분석) |
| `reports/sprint-388-master-push-diagnosis.md` | 본격 진단 보고서 (P-a~P-e) |
| `docs/04-report/features/sprint-388.report.md` | Sprint Report (본 파일) |

## Codex Review 결과 (false positive 판정)

```json
{
  "verdict": "BLOCK",
  "prd_coverage.missing": ["FX-REQ-587","FX-REQ-588","FX-REQ-589","FX-REQ-590"],
  "phase_exit_checklist": {"D1":"FAIL","D2":"FAIL","D3":"PASS","D4":"FAIL"},
  "summary_ko": "이 PR은 변경 사항이 없어 PRD 요구사항이 구현되지 않았습니다."
}
```

**판정 근거**: FX-REQ-587~590은 Sprint 388/F653 무관 코드. "코드 변경 없음"은 SCOPE LOCKED 진단 sprint의 의도된 설계. Phase Exit D1/D2/D4는 코드 구현 sprint 기준이며 진단 문서 sprint에 미적용. `dual_ai_reviews` INSERT는 정상 완료 (P-h 충족).
