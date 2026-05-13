-- ─────────────────────────────────────────────────────────────────────────────
-- D1 시드 Rollback — BeSir 5/14 dry-run + 5/15 미팅 시드 일괄 제거
-- ─────────────────────────────────────────────────────────────────────────────
-- Date: 2026-05-13 (W19 D-2)
-- Purpose: d1-seed-demo.sql 적용 후 운영 환경 복귀 (예: 미팅 종료 후 정리)
-- Execute: cd packages/api && npx wrangler d1 execute foundry-x-db --remote --file=../../scripts/dry-run/d1-seed-rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ append-only 테이블 (UPDATE 차단 trigger):
--   - audit_events: BEFORE UPDATE → FAIL
--   - cross_org_export_blocks: BEFORE UPDATE → FAIL
--   - ethics_violations: BEFORE UPDATE → FAIL
-- DELETE는 허용 (trigger 미적용)되므로 본 rollback SQL은 DELETE만 사용.
-- ⚠️ trace_id 시연용 audit_logs 5건은 정상 운영 데이터와 섞이지 않도록 trace_id 필터로만 삭제.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. 시드 종속성 역순 삭제 (FK 충돌 회피)

-- 1-1. HITL 큐 3 source
DELETE FROM hitl_artifact_reviews WHERE artifact_id IN ('art-demo-001','art-axis-001','art-foundry-001');
DELETE FROM cross_org_review_queue WHERE review_id IN ('rev-demo-001','rev-koami-001');
DELETE FROM agent_improvement_proposals WHERE id LIKE 'prop-demo-%' OR id LIKE 'prop-koami-%' OR id LIKE 'prop-axis-%' OR id LIKE 'prop-foundry-%';

-- 1-2. Ethics + Kill Switch
DELETE FROM kill_switch_state WHERE id = 'ks-demo-001';
DELETE FROM ethics_violations WHERE id = 'viol-001';  -- append-only이지만 DELETE 허용

-- 1-3. Cross-Org (export_blocks → groups 순)
DELETE FROM cross_org_export_blocks WHERE id = 'blk-demo-001';  -- append-only, DELETE 허용
DELETE FROM cross_org_groups WHERE id = 'cog-demo-001';

-- 1-4. Diagnostic (findings → runs 순, FK 의존)
DELETE FROM diagnostic_findings WHERE run_id = 'diag-demo-001';
DELETE FROM diagnostic_runs WHERE id = 'diag-demo-001';

-- 1-5. Audit logs (trace_id 필터로만 — 운영 데이터 보호)
DELETE FROM audit_logs WHERE trace_id IN ('trc-dry-run-2026-05-14','trc-demo-2026-05-15');

-- 1-6. Feedback queue
DELETE FROM feedback_queue WHERE id LIKE 'fq-demo-%' OR id LIKE 'fq-koami-%' OR id LIKE 'fq-axis-%' OR id LIKE 'fq-foundry-%';

-- 1-7. Dual AI reviews (sprint_id로 식별 — 시드 sprint 388~393 demo block 1건만 제거 신중)
-- ⚠️ Sprint 388~393은 실제 운영 sprint와 겹칠 수 있으므로 BLOCK 사례만 삭제 권장:
DELETE FROM dual_ai_reviews WHERE sprint_id = 388 AND codex_verdict = 'BLOCK' AND codex_json LIKE '%BeSir demo block sample%';
-- (Sprint 389~393의 APPROVE 5건은 운영 데이터와 동일 sprint_id 사용 — 그대로 두거나 별도 ID 사용 권장)

-- 1-8. Agent run metrics
DELETE FROM agent_run_metrics WHERE id IN ('arm-001','arm-002','arm-003','arm-004','arm-005','arm-006');

-- 1-9. Graph sessions (biz_items 의존)
DELETE FROM graph_sessions WHERE id IN ('gs-demo-001','gs-koami-001','gs-koami-002','gs-axis-001','gs-decode-001','gs-foundry-001');

-- 1-10. Biz items (organizations 의존)
DELETE FROM biz_items WHERE id IN ('biz-demo-001','biz-koami-001','biz-axis-001','biz-decode-001','biz-foundry-001');

-- 1-11. Organizations (마지막)
-- ⚠️ KOAMI/AXIS-DS/Decode-X/Foundry-X 4 본부는 운영 데이터에서 사용될 가능성 있음.
-- 시연 후 제거하려면 demo-org만 안전 — 4 본부는 별 인터뷰 후 결정:
DELETE FROM organizations WHERE id = 'demo-org';
-- DELETE FROM organizations WHERE id IN ('KOAMI','AXIS-DS','Decode-X','Foundry-X');  -- ⚠️ 주석 처리, 운영 영향 확인 후 사용

-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback 완료. 검증:
--   SELECT COUNT(*) FROM organizations WHERE id = 'demo-org';   -- 기대 0
--   SELECT COUNT(*) FROM audit_logs WHERE trace_id LIKE 'trc-dry-run%' OR trace_id LIKE 'trc-demo%';  -- 기대 0
--   SELECT COUNT(*) FROM ethics_violations WHERE id = 'viol-001';  -- 기대 0
-- ─────────────────────────────────────────────────────────────────────────────
