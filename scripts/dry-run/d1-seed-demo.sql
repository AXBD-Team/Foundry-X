-- ─────────────────────────────────────────────────────────────────────────────
-- D1 시드: BeSir 5/14 dry-run + 5/15 미팅 — demo-org + 4 본부(KOAMI/AXIS-DS/Decode-X/Foundry-X)
-- ─────────────────────────────────────────────────────────────────────────────
-- Date: 2026-05-13 (W19 D-2)
-- Owner: Sinclair Seo
-- Purpose: 20 demo v2 7 step + 18 v2 §8 9 항목 + 21 v2 + 22 v2 점검 항목 대응 D1 시드
-- Trace IDs: trc-dry-run-2026-05-14 (D-1 dry-run) / trc-demo-2026-05-15 (D-day)
-- Execute: cd packages/api && npx wrangler d1 execute foundry-x-db --remote --file=../../scripts/dry-run/d1-seed-demo.sql
-- Rollback: scripts/dry-run/d1-seed-rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. organizations (5건: demo-org + 4 본부)
INSERT OR IGNORE INTO organizations (id, name, slug, plan, settings) VALUES
  ('demo-org',  'BeSir Demo Organization',     'demo-org',  'enterprise', '{"demo":true,"createdFor":"BeSir-5-15-2026"}'),
  ('KOAMI',     'KOAMI Ontology PoC',          'koami',     'enterprise', '{"bonbu":true,"theme":"#6366f1"}'),
  ('AXIS-DS',   'AXIS Design System',          'axis-ds',   'enterprise', '{"bonbu":true,"theme":"#f59e0b"}'),
  ('Decode-X',  'Decode-X Input Plane',        'decode-x',  'enterprise', '{"bonbu":true,"theme":"#10b981"}'),
  ('Foundry-X', 'Foundry-X Control Plane',     'foundry-x', 'enterprise', '{"bonbu":true,"theme":"#ec4899"}');

-- 2. biz_items (5건: graph_sessions FK 충족, 본부당 1건)
INSERT OR IGNORE INTO biz_items (id, org_id, title, description, status, created_by) VALUES
  ('biz-demo-001',  'demo-org',  '퇴직연금 자동 청구 RPA',          'BeSir 시연 시나리오 — 정책팩 export 시도', 'active', 'sinclair'),
  ('biz-koami-001', 'KOAMI',     'KOAMI Ontology PoC 사업',         '내년 본사업 ~10억 연결 후보',             'active', 'sinclair'),
  ('biz-axis-001',  'AXIS-DS',   'AXIS-DS Design System v1.2',      'PR #55 머지 후 KPI 위젯 + HITL Console',  'active', 'sinclair'),
  ('biz-decode-001','Decode-X',  'Decode-X Phase 2-E 분석',         'Multi-Evidence 실 hook 의존',             'active', 'sinclair'),
  ('biz-foundry-001','Foundry-X','AI Foundry Phase 1 정비',         'P0 6/8 토대 + 5 v2 docs 완비',            'active', 'sinclair');

-- 3. graph_sessions (KPI-1 bureau_active_count / KPI-4 diagnostic_time_reduction / KPI-5 e2e_success_rate)
-- demo-org는 running(시연 중) 상태 / 4 본부는 completed(누적 평균용)
INSERT OR IGNORE INTO graph_sessions (id, biz_item_id, org_id, status, discovery_type, started_at, completed_at) VALUES
  ('gs-demo-001',    'biz-demo-001',    'demo-org',  'running',   'discovery', '2026-05-13T05:00:00Z', NULL),
  ('gs-koami-001',   'biz-koami-001',   'KOAMI',     'completed', 'discovery', '2026-05-10T01:00:00Z', '2026-05-10T01:25:00Z'),
  ('gs-koami-002',   'biz-koami-001',   'KOAMI',     'completed', 'shaping',   '2026-05-11T02:00:00Z', '2026-05-11T02:28:00Z'),
  ('gs-axis-001',    'biz-axis-001',    'AXIS-DS',   'completed', 'discovery', '2026-05-09T03:00:00Z', '2026-05-09T03:22:00Z'),
  ('gs-decode-001',  'biz-decode-001',  'Decode-X',  'running',   'analysis',  '2026-05-13T04:00:00Z', NULL),
  ('gs-foundry-001', 'biz-foundry-001', 'Foundry-X', 'completed', 'discovery', '2026-05-08T08:00:00Z', '2026-05-08T08:18:00Z');

-- 4. agent_run_metrics (KPI-3 asset_reuse_rate / KPI-7 api_p95) — 6건, cache_read_tokens 4건 > 0
INSERT OR IGNORE INTO agent_run_metrics (id, session_id, agent_id, status, input_tokens, output_tokens, cache_read_tokens, rounds, stop_reason, duration_ms, started_at, finished_at) VALUES
  ('arm-001', 'sess-demo-org-001',  'agent-discovery-001', 'completed', 1200, 800, 600, 3, 'end_turn', 2400, '2026-05-13T05:00:01Z', '2026-05-13T05:00:03Z'),
  ('arm-002', 'sess-koami-001',     'agent-discovery-001', 'completed', 1500, 1100, 900, 4, 'end_turn', 2800, '2026-05-10T01:00:00Z', '2026-05-10T01:00:03Z'),
  ('arm-003', 'sess-koami-002',     'agent-shaping-001',   'completed',  800,  500,   0, 2, 'end_turn', 1500, '2026-05-11T02:00:00Z', '2026-05-11T02:00:02Z'),
  ('arm-004', 'sess-axis-001',      'agent-design-001',    'completed', 1000,  700, 500, 3, 'end_turn', 2200, '2026-05-09T03:00:00Z', '2026-05-09T03:00:02Z'),
  ('arm-005', 'sess-decode-001',    'agent-analysis-001',  'running',   1300,    0,   0, 0, NULL,        NULL, '2026-05-13T04:00:00Z', NULL),
  ('arm-006', 'sess-foundry-001',   'agent-discovery-001', 'completed',  900,  600, 700, 3, 'end_turn', 1800, '2026-05-08T08:00:00Z', '2026-05-08T08:00:02Z');

-- 5. dual_ai_reviews (KPI-6 hitl_avg_processing / KPI-8 core_diff_blocking_rate)
-- 6건: 5건 양방향 verdict 완료 / 1건 BLOCK
INSERT OR IGNORE INTO dual_ai_reviews (sprint_id, claude_verdict, codex_verdict, codex_json, divergence_score, decision, model) VALUES
  (392, 'APPROVE', 'APPROVE', '{"score":95,"reason":"F619 stub adapter"}', 0.05, 'merge',  'claude-sonnet-4-6'),
  (393, 'APPROVE', 'APPROVE', '{"score":97,"reason":"F621 통합 화면"}',   0.03, 'merge',  'claude-sonnet-4-6'),
  (391, 'APPROVE', 'APPROVE', '{"score":92,"reason":"F656 Vite cache"}', 0.08, 'merge',  'claude-sonnet-4-6'),
  (390, 'APPROVE', 'APPROVE', '{"score":94,"reason":"F655 strict mode"}', 0.06, 'merge',  'claude-sonnet-4-6'),
  (389, 'APPROVE', 'APPROVE', '{"score":98,"reason":"F654 timeout fix"}', 0.02, 'merge',  'claude-sonnet-4-6'),
  (388, 'BLOCK',   'BLOCK',   '{"score":45,"reason":"BeSir demo block sample (시연용)"}', 0.10, 'reject', 'claude-sonnet-4-6');

-- 6. feedback_queue (KPI-2 critical_inconsistency_rate) — 5건, 1건 failed
INSERT OR IGNORE INTO feedback_queue (id, org_id, github_issue_number, github_issue_url, title, body, status) VALUES
  ('fq-demo-001',  'demo-org',  9001, 'https://github.com/KTDS-AXBD/Foundry-X/issues/9001', 'BeSir demo feedback 1', 'demo body 1', 'done'),
  ('fq-demo-002',  'demo-org',  9002, 'https://github.com/KTDS-AXBD/Foundry-X/issues/9002', 'BeSir demo feedback 2', 'demo body 2', 'done'),
  ('fq-koami-001', 'KOAMI',     9011, 'https://github.com/KTDS-AXBD/Foundry-X/issues/9011', 'KOAMI Ontology gap',    'gap detail',  'pending'),
  ('fq-axis-001',  'AXIS-DS',   9021, 'https://github.com/KTDS-AXBD/Foundry-X/issues/9021', 'AXIS-DS PR #55 hotfix', 'hotfix body', 'failed'),
  ('fq-foundry-001','Foundry-X',9031, 'https://github.com/KTDS-AXBD/Foundry-X/issues/9031', 'Foundry-X v1.2 docs',   'v1.2 patch',  'done');

-- 7. audit_logs (F642 trace_id chain) — Step 1~5 데모용 5 events, trace_id='trc-dry-run-2026-05-14'
INSERT OR IGNORE INTO audit_logs (id, tenant_id, event_type, agent_id, model_id, input_classification, output_type, trace_id, metadata) VALUES
  ('evt_diag_001',   'demo-org', 'diagnostic.run',             NULL,                          NULL, 'internal', 'json', 'trc-dry-run-2026-05-14', '{"diagnostic_types":["missing","duplicate","overspec","inconsistency"],"findings_count":6}'),
  ('evt_cross_001',  'demo-org', 'cross-org.assign-group',     NULL,                          NULL, 'internal', 'json', 'trc-dry-run-2026-05-14', '{"asset_id":"pol-rpa-pension-claim-001","group_type":"core_differentiator"}'),
  ('evt_cross_002',  'demo-org', 'cross-org.check-export.deny',NULL,                          NULL, 'internal', 'json', 'trc-dry-run-2026-05-14', '{"asset_id":"pol-rpa-pension-claim-001","target_org":"hr-bonbu","decision":"deny"}'),
  ('evt_ethics_001', 'demo-org', 'ethics.escalate',            'agent-decision-pension-001',  NULL, 'internal', 'json', 'trc-dry-run-2026-05-14', '{"confidence":0.65,"threshold":0.7,"violation_id":"viol-001"}'),
  ('evt_audit_001',  'demo-org', 'audit.chain.retrieved',      NULL,                          NULL, 'internal', 'json', 'trc-dry-run-2026-05-14', '{"events_count":4,"chain_valid":true}');

-- 8. diagnostic_runs + diagnostic_findings (F602) — Step 1 시연용
INSERT OR IGNORE INTO diagnostic_runs (id, org_id, diagnostic_types, status, summary, trace_id, created_at, completed_at) VALUES
  ('diag-demo-001', 'demo-org', '["missing","duplicate","overspec","inconsistency"]', 'completed',
   '{"missing":3,"duplicate":1,"overspec":2,"inconsistency":0}',
   'trc-dry-run-2026-05-14',
   1747273800000, 1747273810000);

INSERT OR IGNORE INTO diagnostic_findings (id, run_id, org_id, diagnostic_type, severity, entity_id, detail) VALUES
  ('df-001', 'diag-demo-001', 'demo-org', 'missing',       'warning',  'ent-rollback-section', '{"reason":"no rollback section in policy"}'),
  ('df-002', 'diag-demo-001', 'demo-org', 'missing',       'warning',  'ent-audit-trail',      '{"reason":"missing audit trail spec"}'),
  ('df-003', 'diag-demo-001', 'demo-org', 'missing',       'critical', 'ent-error-handler',    '{"reason":"no error handler"}'),
  ('df-004', 'diag-demo-001', 'demo-org', 'duplicate',     'info',     'ent-validation-rule',  '{"reason":"duplicate validation in 2 places"}'),
  ('df-005', 'diag-demo-001', 'demo-org', 'overspec',      'warning',  'ent-retry-policy',     '{"reason":"3-level retry is overspec"}'),
  ('df-006', 'diag-demo-001', 'demo-org', 'overspec',      'info',     'ent-logging',          '{"reason":"verbose logging overhead"}');

-- 9. cross_org_groups (F603) — demo policy를 core_differentiator로 분류
-- + Decode-X balanced 보완 (S357+, 23 v1 §8.9.3 결정 적용): expert-review용 asset 사전 등록
INSERT OR IGNORE INTO cross_org_groups (id, asset_id, asset_kind, org_id, group_type, commonality, variance, documentation_rate, business_impact, assigned_by, assigned_at) VALUES
  ('cog-demo-001',   'pol-rpa-pension-claim-001', 'policy', 'demo-org', 'core_differentiator', 0.15, 0.78, 0.85, 'high',   'auto', 1747273820000),
  ('cog-decode-001', 'pol-decode-analysis-001',   'policy', 'Decode-X', 'org_specific',         0.45, 0.50, 0.70, 'medium', 'auto', 1747273825000);

-- 10. cross_org_export_blocks (F603 default-deny) — demo Step 3 시연용 (append-only)
INSERT INTO cross_org_export_blocks (id, asset_id, org_id, reason, attempted_action, trace_id, metadata) VALUES
  ('blk-demo-001', 'pol-rpa-pension-claim-001', 'demo-org', 'export_blocked', 'export_to_hr_bonbu',
   'trc-dry-run-2026-05-14',
   '{"target_org":"hr-bonbu","blocked_by":"default_deny_policy","group":"core_differentiator"}');

-- 11. ethics_violations (F607) — Step 4 시연용 (append-only)
INSERT INTO ethics_violations (id, org_id, agent_id, violation_type, threshold_value, actual_value, trace_id, escalated_to_human, metadata) VALUES
  ('viol-001', 'demo-org', 'agent-decision-pension-001', 'confidence_threshold', 0.7, 0.65, 'trc-dry-run-2026-05-14', 1,
   '{"decision":"auto-claim-trigger","action":"escalate_to_hitl"}');

-- 12. kill_switch_state (F607) — demo agent (inactive 상태로 시드, 시연 중 활성화 가능)
INSERT OR IGNORE INTO kill_switch_state (id, org_id, agent_id, active, reason, created_at, updated_at) VALUES
  ('ks-demo-001', 'demo-org', 'agent-decision-pension-001', 0, NULL, 1747273800000, 1747273800000);

-- 13. agent_improvement_proposals (F605 meta-approval source) — 4건
-- ⚠️ rubric_score 컬럼은 INTEGER (0137 ALTER, F542 M4 Sprint 290 추가)
-- F605 collectProposals는 `escalated = rubric_score < 0.7` 비교 (HITL_CONFIDENCE_THRESHOLD = 0.7)
-- INTEGER 0~100 스케일에서 < 0.7 비교하면 0만 escalated=true → 시연용으로 1건만 rubric_score=0 시드
-- (rubric_score normalize 0~1로 fix는 후속 F-item, 22 v2 §4 시연 멘트로 보강)
INSERT OR IGNORE INTO agent_improvement_proposals (id, session_id, agent_id, type, title, reasoning, yaml_diff, status, rubric_score) VALUES
  ('prop-demo-001',  'sess-demo-org-001',  'agent-discovery-001', 'prompt', 'BeSir demo prompt 개선 (escalated)', 'demo 시연용 prompt 강화', 'diff: +threshold 0.8', 'pending',  0),
  ('prop-koami-001', 'sess-koami-001',     'agent-discovery-001', 'tool',   'KOAMI Ontology tool 추가',           'Ontology 추출 도구 강화',  'diff: +ontology_tool', 'pending', 82),
  ('prop-axis-001',  'sess-axis-001',      'agent-design-001',    'graph',  'AXIS-DS graph 최적화',                'KPI 위젯 graph layout',   'diff: +metric_grid',    'pending', 78),
  ('prop-foundry-001','sess-foundry-001',  'agent-discovery-001', 'model',  'Foundry-X model 업그레이드',          'Sonnet 4.6 → Opus 4.7',  'diff: model="opus"',    'pending', 91);

-- agent_improvement_proposals: rubric_score 컬럼 미존재 환경 대응 — 시도 후 무시
-- (현재 schema 0133에 rubric_score 없음 — F605 collector가 rubric_score를 별 컬럼이 아닌 NULL 처리한다고 가정. 22 v2 §4 참조)
-- ↑ 위 INSERT가 0133 schema에 없는 컬럼이라 에러 발생 가능 → schema 확인 후 별도 ALTER 또는 column 제외 처리 권장.

-- 14. cross_org_review_queue (F605 expert-review source) — 3건 pending (S357+ balanced 보완)
-- demo-org + KOAMI + Decode-X (Decode-X 보완 시드, 23 v1 §8.9.3 결정 적용 → 4 본부 balanced)
-- 주의: cog-koami-001 assignment_id는 cross_org_groups에 사전 등록 안 됨 — 의도된 dangling reference (F605 collectReviewQueue가 assignment_id FK 검증 안 함)
INSERT OR IGNORE INTO cross_org_review_queue (review_id, assignment_id, org_id, status, decision, expert_id, notes, enqueued_at) VALUES
  ('rev-demo-001',   'cog-demo-001',   'demo-org', 'pending', NULL, NULL, NULL, 1747273830000),
  ('rev-koami-001',  'cog-koami-001',  'KOAMI',    'pending', NULL, NULL, NULL, 1747273840000),
  ('rev-decode-001', 'cog-decode-001', 'Decode-X', 'pending', NULL, NULL, NULL, 1747273850000);

-- 15. hitl_artifact_reviews (F605 artifact-review source) — 3건 (action enum: approved/modified/regenerated/rejected, 'pending' 불가)
INSERT OR IGNORE INTO hitl_artifact_reviews (id, tenant_id, artifact_id, reviewer_id, action, reason) VALUES
  (lower(hex(randomblob(16))), 'demo-org',  'art-demo-001',    'sinclair', 'approved', 'BeSir demo artifact OK'),
  (lower(hex(randomblob(16))), 'AXIS-DS',   'art-axis-001',    'sinclair', 'modified', 'PR #55 머지 후 수정'),
  (lower(hex(randomblob(16))), 'Foundry-X', 'art-foundry-001', 'sinclair', 'regenerated', 'v1.2 patch 재생성');

-- ─────────────────────────────────────────────────────────────────────────────
-- 시드 완료. 검증 query는 23_dry_run_d1_seed_v1.md §3 참조.
-- ─────────────────────────────────────────────────────────────────────────────
