-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  details TEXT DEFAULT '{}',
  source TEXT DEFAULT 'system',
  metadata TEXT DEFAULT '{}',
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);