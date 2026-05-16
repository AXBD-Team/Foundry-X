-- F663: HITL 80-20-80 5-state 머신 hitl_queue 테이블
CREATE TABLE IF NOT EXISTS hitl_queue (
  id TEXT PRIMARY KEY,
  graph_session_id TEXT,
  cq_evaluation_id TEXT,
  org_id TEXT NOT NULL,
  state TEXT NOT NULL,
  reviewer_id TEXT,
  payload TEXT,
  audit_trace_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  transitioned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (state IN ('AI_GENERATED','REVIEW_QUEUED','HUMAN_REVIEWED','AI_REVISED','FINAL_APPROVED'))
);

CREATE INDEX IF NOT EXISTS idx_hitl_queue_org_state ON hitl_queue(org_id, state);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_graph_session ON hitl_queue(graph_session_id);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_trace ON hitl_queue(audit_trace_id);
