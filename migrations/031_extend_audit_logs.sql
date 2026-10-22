-- Extend audit_logs with the HTTP context columns used by the audit middleware.
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN method TEXT;
ALTER TABLE audit_logs ADD COLUMN path TEXT;
ALTER TABLE audit_logs ADD COLUMN status_code INTEGER;
ALTER TABLE audit_logs ADD COLUMN duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON audit_logs(path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
