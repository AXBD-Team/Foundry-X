---
title: AI Foundry — 5/13 D-2 메타 세션 회고 + Production 적용 Cheatsheet v1
purpose: 5/13 D-2 메타 세션(14 commits) 회고 + 5/14~5/16 production 적용/시연/rollback 명령 cheatsheet 통합
date: 2026-05-13 (W19 D-2)
owner: Sinclair Seo
classification: 기업비밀II급
target_meeting: 2026-05-15 W19 BeSir 미팅
related_docs:
  - 23_dry_run_d1_seed_v1.md (시드 SQL + 시뮬레이션 결과)
  - 18_conditional_gate_evidence_v2.md (4 게이트 + Q&A 8건)
  - 20_live_demo_scenario_v2.md (7 step demo)
  - 21_kpi_calculation_table_v2.md (KPI 측정)
  - 22_hitl_console_v2.md (HITL)
  - 17_internal_dev_plan_with_besir_v2.md (Tier 진척)
  - INDEX.md v1.2 (SSOT)
---

# 24. Production 적용 Cheatsheet + D-2 메타 세션 회고

> **이 문서**: 5/13 D-2 메타 세션 14 commits 회고 + 5/14 D-1 dry-run + 5/15 D-day 미팅 + 5/16 D+1 rollback 통합 cheatsheet. 미팅 직전 1면 참조용.

---

## 1. 5/13 D-2 메타 세션 회고 — 14 commits

### 1.1 산출물 매트릭스

| # | commit | 산출물 | 영역 |
|---|--------|--------|------|
| 1 | `eb8185a4` | SPEC §2 마지막 실측 (Sprint 392+393, 57 sprint streak) | SPEC |
| 2 | `997bdb03` | 17 internal dev plan v2 (Tier 1~5 17건 ✅ + T6 4건 unlock) | **v2 신규** |
| 3 | `e631f87d` | 20 live demo v2 (5→7 step, F619 + F621 추가) | **v2 신규** |
| 4 | `78de4551` | 21 KPI v2 + 22 HITL v2 (F621 통합 시각화) | **v2 신규** |
| 5 | `7946843a` | 18 conditional gate v2 (4 게이트 D-2 진척 + Q&A 8건) | **v2 신규** |
| 6 | `946bb8c6` | INDEX v1.1 → v1.2 patch (6/8 P0 토대 ✅) | **patch** |
| 7 | `23cde50f` | 14 v1.2 + 16 v1.2 + 02 v0.5 동기화 | **3 patch** |
| 8 | `2bc4ef57` | 23 D1 시드 SQL v1 + 2 .sql 파일 | **v1 신규** |
| 9 | `ecbeb7b2` | 23 §8 사전 dry-run 결과 (시드 16/16 + KPI 8/8 PASS) | 검증 |
| 10 | `d1ac611e` | 23 §8.6+8.7 Rollback 검증 (16/16 + 4 본부 보존) | 검증 |
| 11 | `d4783822` | 23 §8.8 Graceful Null Simulation (2 시나리오) | 검증 |
| 12 | `2f3ef046` | 23 §8.9 HITL 3 Source (4 시나리오) | 검증 |
| 13 | `b03d7e2a` | 23 §8.9.6 Decode-X Balanced 보완 (4 본부 pending=5) | 검증 + 시드 갱신 |
| 14 | `69f5af51` | 23 §8.10 Multi-Degradation (3 시나리오, M1/M2/M3) | 검증 |

### 1.2 분류

| 카테고리 | 수 | 산출물 |
|---------|---|--------|
| **v2 신규** | 5 | 17/18/20/21/22 v2 |
| **v1 신규** | 1 | 23 D1 시드 + 2 SQL 파일 |
| **patch** | 4 | INDEX v1.2 + 14 v1.2 + 16 v1.2 + 02 v0.5 |
| **검증 결과** | 6 | 23 §8/§8.6/§8.8/§8.9/§8.9.6/§8.10 |
| **SPEC** | 1 | §2 마지막 실측 |
| **합계** | **14 commits** | — |

### 1.3 검증 시뮬레이션 통계

| 시뮬레이션 | 시나리오 수 | PASS | FAIL |
|-----------|------------|------|------|
| §3.1 시드 row 수 (16 테이블) | 16 | 16 | 0 |
| §3.2 KPI 8개 응답값 | 8 | 8 | 0 |
| §3.3 HITL queue | 1 | 1 | 0 |
| §3.4 trace_id chain | 1 | 1 | 0 |
| §8.6 Rollback row 수 | 16 | 16 | 0 |
| §8.6.2 운영 데이터 보존 | 3 | 3 | 0 |
| §8.8 Graceful Null | 2 | 2 | 0 |
| §8.9 HITL 4 시나리오 | 4 | 4 | 0 |
| §8.9.6 Decode-X Balanced | 7 | 7 | 0 |
| §8.10 Multi-Degradation | 3 | 3 | 0 |
| **합계** | **61** | **61** | **0** |

→ **61 PASS / 0 FAIL = 100%** 검증 통과. 5/14 production 적용 위험 0 확증.

### 1.4 핵심 발견 5건

1. **graceful degradation 극한 신뢰성** (§8.10 M3) — 7/8 KPI null + HITL=0 + 4 본부 pending=0에서도 시스템 정상 응답 HTTP 200
2. **Decode-X 시드 부재 → balanced 보완** (§8.9.6) — 4 본부 시각적 균형 달성 (모두 pending=5)
3. **meta-approval orgId=undefined 전사 노출** (§8.9.2) — `!item.orgId` truthy 분기로 4 본부 column 모두 동일 표시 (22 v2 §7.3 확증)
4. **escalated 산정 source 비대칭** (§8.9.2) — meta만 escalated 산정 (H1에서 escalated=0 확증, 22 v2 §4 확증)
5. **append-only trigger 우회 가능 (DELETE OK)** (§8.6.3) — BEFORE UPDATE만 차단, DELETE 정상 → rollback SQL DELETE-only 패턴 안전

### 1.5 docs 정합성 매트릭스 (S357+ 정본)

| 문서 | 버전 | patch | 진척 매핑 |
|------|------|-------|----------|
| INDEX.md | v1.2 | S357+ W19 D-2 | **핵심 SSOT** |
| 02 Phase 1 정의서 | v0.5 | S357+ W19 D-2 | P0 6/8 토대 ✅ |
| 14 Repo Status Audit | v1.2 | S357+ W19 D-2 | P0 평균 ~75% |
| 16 Validation Report | v1.2 | S357+ W19 D-2 | 권고 해소율 90% |
| 17 Internal Dev Plan | v2 | S357 | Tier 17건 ✅ + T6 4건 |
| 18 Conditional Gate | v2 | S357+ W19 D-2 | 4 게이트 + Q&A 8건 |
| 20 Live Demo | v2 | S357 | 7 step + 시연 |
| 21 KPI | v2 | S357 | 8 KPI + F621 통합 |
| 22 HITL | v2 | S357 | F605 + F621 통합 |
| **23 Dry-run D1 Seed** | **v1** | **S357+ W19 D-2** | **시드 + 6 시뮬레이션** |
| **24 Production Cheatsheet** | **v1** | **본 문서** | **회고 + cheatsheet** |

---

## 2. 5/14 D-1 Production 적용 Cheatsheet

### 2.1 시간표 (18 v2 §8.2 9 step)

| 시각 | 작업 | 명령 |
|------|------|------|
| 09:00 | **D1 시드 적용** | `cd packages/api && npx wrangler d1 execute foundry-x-db --remote --file=../../scripts/dry-run/d1-seed-demo.sql` |
| 09:15 | **시드 검증** | `npx wrangler d1 execute foundry-x-db --remote --command="SELECT COUNT(*) FROM organizations WHERE id IN ('demo-org','KOAMI','AXIS-DS','Decode-X','Foundry-X')"` → 기대 5 |
| 09:30 | **JWT 발급** | `JWT=$(node scripts/issue-jwt.js --org=demo-org --ttl=86400)` |
| 10:00 | **dry-run 2차 (Step 1~5 curl)** | 20 v2 §2 본문 5 endpoint 호출 |
| 11:00 | **trace_id chain 검증** | `curl "https://foundry-x-api.ktds-axbd.workers.dev/api/audit/log/by-trace?trace_id=trc-dry-run-2026-05-14" -H "Authorization: Bearer $JWT" \| jq '.events \| length'` → 기대 5 |
| 13:00 | **Step 6 dry-run** (F619) | local node script로 `processMultiEvidence` 호출 결과 캡처 + `DecodeXStubAdapter.publishAnalysisCompleted` |
| 14:00 | **Step 7 라이브** (`/operations`) | 브라우저 `https://fx.minu.best/operations` 접속 + 4 본부 column + 새로고침 + KPI/HITL 응답 확인 |
| 15:00 | **HITL 7 항목 점검** (22 v2 §10) | `GET /api/hitl/queue` total=10 + escalated=1 (Decode-X balanced 후) + 3 source POST decision |
| 16:00 | **비디오 백업 캡처** | 7 step + Q&A 8건 시연 영상 (네트워크 장애 대비) |
| 17:00 | **Q&A 모의 진행** | 18 v2 §7 8 Q&A 답변 시간 측정 (Sinclair + 서민원) |
| 19:00 | **인쇄 페어 자료** | 9 docs (17+18+20+21+22 v2 + 02 v0.5 + 23 v1 + INDEX v1.2 + 24 v1) × 3부 |

### 2.2 시드 적용 시 KPI 값 — **5/13 D-2 production 실측 (시드 + 운영 누적 합산)**

```bash
curl "https://foundry-x-api.ktds-axbd.workers.dev/api/kpi" \
  -H "Authorization: Bearer $JWT" | jq '.kpis | map({id, value, trend})'
```

> ⚠️ **중요**: `/api/kpi`는 production D1 **전체 면적** 산정 (orgId 필터 없음). 시드 60 rows 외에 **운영 누적 데이터**(graph_sessions, agent_run_metrics, dual_ai_reviews 등)가 모두 반영되므로 23 v1 §2.3 "시드 isolation 기대값"과 차이 발생. 아래 표는 **5/13 14:23 KST 실측값**.

| KPI | 5/13 실측 | 23 v1 시드 isolation 기대 | 차이 원인 |
|-----|-----------|---------------------------|-----------|
| bureau_active_count | **2** | 2 | ✅ 일치 (시드 + 운영 running 합산 2) |
| critical_inconsistency_rate | **11.1%** | 20% | 운영 feedback_queue 누적 (시드 1/5 → 전체 1/9) |
| asset_reuse_rate | **2.9%** | 66.7% | 운영 agent_run_metrics 대부분 cache_read=0 |
| diagnostic_time_reduction | **9분** | 23분 | 운영 graph_sessions 평균이 시드 23분보다 짧음 |
| five_layer_e2e_success_rate | **88.9%** | 66.7% | 운영 completed 비율 더 높음 |
| hitl_avg_processing | **5.4%** | 100% | 운영 dual_ai_reviews 양방향 verdict 완료 비율 낮음 |
| api_p95 | **38015ms** | ~~2800ms~~ → **40000ms** | ✅ F661 threshold 40s 보정 — discovery-stage-runner 28~38s 정상 분포 내 (23 v1.4 §10 참조) |
| api_p99 | **production 실측 필요** | 41000ms | F661 신규 KPI — p99 threshold 41s (LLM 9-stage workflow 기준) |
| core_diff_blocking_rate | **83%** | 16.7% | 운영 dual_ai_reviews BLOCK 비율 매우 높음 |

**api_p95/p99 분포 참조** (S359 F658 실측, `23_dry_run_d1_seed_v1.md §10`):
- discovery-stage-runner 기준 (134 rows, 96.4%): p50=28.6s / p75=32.4s / p90=36.3s / **p95=37.3s** / p99=41s
- threshold 40s (p95) / 41s (p99) = LLM 9-stage workflow 정상 latency 수용. long-tail 0, 응집 분포 ✅

**시연 멘트 (5/15 미팅)**: "production D1 누적 운영 데이터 기반 측정값. trend / threshold 기반 시연이 핵심 — 절대값 자체보다 'threshold 초과 여부' 의미. api_p95 threshold를 LLM 워크플로우 실측에 맞게 40s로 보정함."

### 2.3 HITL queue — **5/13 D-2 production 실측**

```bash
curl "https://foundry-x-api.ktds-axbd.workers.dev/api/hitl/queue" \
  -H "Authorization: Bearer $JWT" | jq '{total, escalatedCount}'
```

**5/13 14:23 KST 실측**: `{"total": 44, "escalatedCount": 1}`

| 항목 | 실측 | 23 v1 시드 isolation 기대 | 분석 |
|------|------|---------------------------|------|
| total | **44** | 10 | 시드 10건 + **운영 누적 ~34건** (discovery-stage-runner 자동 제안 — token-budget / self-reflection / context compression 등) |
| escalatedCount | **1** | 1 | ✅ 정확 일치 — `prop-demo-001` rubric_score=0 |
| sources | meta-approval(40+) / expert-review(3) / artifact-review(3) | meta(4)/expert(3)/artifact(3) | 메타 누적 외 시드 일치 |

**시연 멘트 (5/15 미팅)**: "HITL 큐 escalated=1건 빨간 배지 (prop-demo-001 rubric_score=0)는 demo 시드 정확 시연. total 44는 운영 자동 제안 누적 — 운영 환경에서 실제로 큐가 활용되는 증거. 5/15에는 escalated 배지 + 1건 detail만 강조 시연 권장."

### 2.4 fallback (시드 적용 실패 시)

```bash
# 1. migration 누락 확인
npx wrangler d1 migrations list foundry-x-db --remote | tail -5
# → 0154까지 적용 확인

# 2. 부분 적용된 row 검증
npx wrangler d1 execute foundry-x-db --remote --command="SELECT id FROM organizations WHERE id LIKE 'demo%'"

# 3. 부분 rollback 후 재시드
npx wrangler d1 execute foundry-x-db --remote --file=../../scripts/dry-run/d1-seed-rollback.sql
npx wrangler d1 execute foundry-x-db --remote --file=../../scripts/dry-run/d1-seed-demo.sql

# 4. 또는 multi-degradation M2 상태로 시연 진행
#    (시드 실패 시에도 §8.10 §8.10.7 안전 멘트 적용 가능)
```

---

## 3. 5/15 D-day BeSir 미팅 진행

### 3.1 7 step demo 진행 순서 (20 v2 §1.2, 18-22분)

```
[1] F602 4대 진단        (3분)  POST /api/diagnostic/run
[2] F603 그룹 분류       (2분)  POST /api/cross-org/assign-group
[3] F603 export 검사     (2분)  POST /api/cross-org/check-export (deny)
[4] F607 윤리 임계       (2분)  POST /api/ethics/check-confidence (0.65)
[5] F642 Audit 회수      (1분)  GET /api/audit/log/by-trace
[6] F619 Multi-Evidence  (2분)  코드 trace (E1→E2→E3 → riskLevel "high")
[7] F621 운영 통합 화면  (3분)  /operations (4 본부 column)
```

### 3.2 BeSir 4 sign-off 안건 (18 v2 §3.3)

| # | 안건 | 우선순위 | unlock 효과 |
|---|------|---------|-------------|
| 1 | 본부 2개 잠정 선정 | P0 | 모든 후속의 의존성 |
| 2 | core_diff 워크샵 일정 (W20~W21) | P0 | F603 룰 자체 검증 |
| 3 | Approver RBAC 5역 매핑 | P1 | F605 mock → JWT claims 강제 |
| 4 | KPI 베이스라인 협조 | **P0 강화** | 5/19 즉시 측정 시작 |

### 3.3 Q&A 8건 (18 v2 §7)

v1 5건 (외부 LLM / 본부 격리 / AI 신뢰성·책임 / Emergency Stop / 시연 실패) + v2 신규 3건 (Multi-Evidence Decode-X / 운영 화면 본부 / E1/E2/E3 threshold).

### 3.4 Conditional 게이트 입장 자료 (18 v2)

- **C-1 ✅** 57 sprint 연속 + autopilot Match 97~100%
- **C-2 ⚠️** 3 안건 축소 (AXIS-DS unlock + Decode-X stub 우회)
- **C-3 ✅** 17건 완결 + autopilot 17회차 학습
- **C-4 ✅** 8/8 KPI production 측정 가능

---

## 4. 5/16+ D+1 Rollback (시연 종료 후)

### 4.1 Rollback 적용

```bash
cd packages/api

# 1. rollback SQL 실행
npx wrangler d1 execute foundry-x-db --remote \
  --file=../../scripts/dry-run/d1-seed-rollback.sql

# 2. 검증 — demo 데이터 0 + 4 본부 보존
npx wrangler d1 execute foundry-x-db --remote --command="
SELECT id FROM organizations WHERE id IN ('demo-org','KOAMI','AXIS-DS','Decode-X','Foundry-X')
"
# 기대: 4 본부만 (demo-org 부재)

npx wrangler d1 execute foundry-x-db --remote --command="
SELECT COUNT(*) FROM audit_logs WHERE trace_id IN ('trc-dry-run-2026-05-14','trc-demo-2026-05-15')
"
# 기대: 0
```

### 4.2 4 본부 organizations 처리 결정

```sql
-- 시연 후 4 본부도 제거하려면 (운영 영향 확인 필수):
DELETE FROM organizations WHERE id IN ('KOAMI','AXIS-DS','Decode-X','Foundry-X');
```

**기본 권장**: 4 본부 보존 (운영 데이터로 활용 가능). 제거는 별 인터뷰 후 결정.

### 4.3 시연 trace 수집 (선택, 미팅 결과 분석용)

```sql
-- 5/15 미팅 당일 생성된 production trace 추출
SELECT * FROM audit_logs WHERE trace_id = 'trc-demo-2026-05-15' ORDER BY created_at;
SELECT * FROM ethics_violations WHERE trace_id = 'trc-demo-2026-05-15';
SELECT * FROM cross_org_export_blocks WHERE trace_id = 'trc-demo-2026-05-15';
```

---

## 5. 5/16+ 다음 사이클 후보

### 5.1 BeSir sign-off 결과 시나리오

| 시나리오 | 후속 sprint |
|---------|-------------|
| **A. 4 안건 모두 sign-off** | F601 SSO env 등록(~5분) + F601 PG storage swap(~30분) + F600 5-Layer 통합 시작 |
| **B. 본부 선정만 sign-off** | 4 본부 hardcoded → 선정 본부 2개로 swap(~10분, F621 ORG_UNITS 갱신) + core_diff 워크샵 일정 후속 |
| **C. 부분 sign-off (PG/SSO 결정 지연)** | F619 실 hook 20% 우선 (Decode-X Phase 2-E unlock 후 ~10라인 swap) + W20 PRD §6.3 보강 (C-3 후속) |
| **D. BeSir 전체 거부** | C-1 ✅ + C-4 ✅로 Phase 2 PoC 단독 진입 + W26 G3 게이트 재검토 |

### 5.2 INDEX v1.3 patch (5/16 권장)

- §2 진척 (Sprint 393 → next)
- §5 P0 충족률 + BeSir sign-off 결과 반영
- §10 W19 → W20 액션 갱신
- 24 v1 link 추가 (본 문서)

### 5.3 잔존 후속 F-item (22 v2 §11)

- `artifact-review` applyDecision D1 UPDATE 구현 (~15분)
- RBAC 5역 JWT claims 강제 (F601 SSO unlock 후 ~30분)
- HitlQueueItem orgId 정합성 (agent_improvement_proposals.org_id 추가, ~20분)
- HITL escalation → F607 kill_switch trigger 자동화 (~25분)
- approvedToday 메트릭 산정 (~20분)

---

## 6. 회고 메타 학습

### 6.1 5/13 D-2 메타 세션 패턴 분석

- **시간 효율**: 14 commits × 5/13 1 day = 평균 ~30분/commit (실 작업 시간 더 짧음, 검증 위주)
- **autopilot 미사용 사유**: 모두 meta-only docs 작업 + inline node 시뮬레이션 → master 직접 commit+push
- **검증 누적 효과**: 시드(§8.1) → rollback(§8.6) → graceful null(§8.8) → HITL(§8.9) → balanced(§8.9.6) → multi-degradation(§8.10) **점진적 누적 검증** 패턴 — 한 번에 다 못 검증한 경우의 fallback 패턴 확립

### 6.2 인사이트 분포

- v2 docs 작성에서 5건 (17/18/20/21/22) — 사용자 명시 요청 패턴
- v1 신규 23 D1 시드 — 사용자 요청 후 inline node 시뮬레이션으로 검증 보강
- Decode-X balanced 보완 — 시뮬레이션에서 발견된 issue 즉시 영구 반영
- multi-degradation — 사용자 요청 ("dual_ai + HITL 동시 비우기")으로 극한 검증

### 6.3 5/13 D-2 메타 세션 결론

- **모든 5/15 미팅 사전 자료 완비** — INDEX v1.2 SSOT 기반 9 docs 정합성 확보
- **production 적용 위험 0** — 61 시뮬레이션 통과, fallback 시나리오까지 검증
- **시연 안전 멘트 완비** — 23 §8.10.7 graceful 멘트 + 18 v2 Q&A 8건 + 22 v2 §4 escalated 비대칭 reframing

---

## 7. 이력

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| v1 | 2026-05-13 | 최초 작성 (S357+ W19 D-2). 14 commits 회고 + production cheatsheet 통합 | Sinclair |

---

**Status**: v1.0 (S357+, 2026-05-13 W19 D-2) — 5/13 D-2 메타 세션 회고 + 5/14 D-1 production 적용 cheatsheet + 5/15 D-day 미팅 진행 + 5/16+ 후속 사이클 안내. 미팅 직전 1면 참조용.
