-- F662: graph_session 종결 CQ 자동 평가 hook
-- graph_session_id: discovery graph 실행 세션 연결
-- failure_reason: <90점 자동 분류 (human_error | infra_issue)
-- SQLite ALTER TABLE은 ADD COLUMN만 지원 — CHECK 제약은 service 레이어에서 검증
ALTER TABLE cq_evaluations ADD COLUMN graph_session_id TEXT;
ALTER TABLE cq_evaluations ADD COLUMN failure_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_cq_evaluations_graph_session ON cq_evaluations(graph_session_id);
