-- F642: Audit Bus T2 — trace_id chain enrichment
ALTER TABLE audit_logs ADD COLUMN trace_id TEXT;
CREATE INDEX idx_audit_trace_id ON audit_logs(trace_id) WHERE trace_id IS NOT NULL;
