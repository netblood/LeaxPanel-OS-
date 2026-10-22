-- Extend audit_logs table
ALTER TABLE audit_logs ADD COLUMN country TEXT;
ALTER TABLE audit_logs ADD COLUMN city TEXT;
ALTER TABLE audit_logs ADD COLUMN device_type TEXT;
ALTER TABLE audit_logs ADD COLUMN browser TEXT;
ALTER TABLE audit_logs ADD COLUMN os TEXT;
ALTER TABLE audit_logs ADD COLUMN resource_type TEXT;
ALTER TABLE audit_logs ADD COLUMN resource_name TEXT;
ALTER TABLE audit_logs ADD COLUMN old_values TEXT;
ALTER TABLE audit_logs ADD COLUMN new_values TEXT;
ALTER TABLE audit_logs ADD COLUMN result TEXT DEFAULT 'success';
ALTER TABLE audit_logs ADD COLUMN error_message TEXT;
ALTER TABLE audit_logs ADD COLUMN metadata TEXT DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN severity TEXT DEFAULT 'info';

UPDATE audit_logs SET resource_type = resource WHERE resource_type IS NULL;
UPDATE audit_logs SET result = CASE WHEN status_code >= 400 THEN 'failure' ELSE 'success' END WHERE result IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address);

-- Extend security_alerts table
ALTER TABLE security_alerts ADD COLUMN source_ip TEXT;
ALTER TABLE security_alerts ADD COLUMN source_country TEXT;
ALTER TABLE security_alerts ADD COLUMN source_device TEXT;
ALTER TABLE security_alerts ADD COLUMN resource_type TEXT;
ALTER TABLE security_alerts ADD COLUMN resource_id TEXT;
ALTER TABLE security_alerts ADD COLUMN resource_name TEXT;
ALTER TABLE security_alerts ADD COLUMN is_acknowledged INTEGER DEFAULT 0;

UPDATE security_alerts SET is_acknowledged = acknowledged WHERE is_acknowledged IS NULL;

CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ack ON security_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);

-- Security alert rules (configurable)
CREATE TABLE IF NOT EXISTS security_alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL UNIQUE,
  description TEXT,
  severity TEXT DEFAULT 'warning',
  is_enabled INTEGER DEFAULT 1,
  conditions TEXT DEFAULT '{}',
  cooldown_minutes INTEGER DEFAULT 60,
  notify_channels TEXT DEFAULT '["dashboard"]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO security_alert_rules (name, type, description, severity, conditions) VALUES
  ('Database Deletion', 'database_deletion', 'Alert when a database is deleted', 'critical', '{"action": "delete", "resource_type": "database"}'),
  ('Permission Change', 'permission_change', 'Alert when user permissions are modified', 'warning', '{"action": "update", "resource_type": "permission"}'),
  ('Admin Creation', 'admin_creation', 'Alert when a new admin user is created', 'critical', '{"action": "create", "resource_type": "user", "role": "admin"}'),
  ('Dangerous Command', 'dangerous_command', 'Alert on potentially dangerous terminal commands', 'critical', '{"commands": ["rm -rf", "dd if=", "mkfs", "format", "shutdown", "reboot", "kill -9", "chmod 777", "chown root"]}'),
  ('Firewall Change', 'firewall_change', 'Alert when firewall rules are modified', 'warning', '{"action": "update", "resource_type": "firewall"}'),
  ('Mass Delete', 'mass_delete', 'Alert when multiple resources are deleted rapidly', 'critical', '{"threshold": 5, "window_minutes": 5}'),
  ('New Device Login', 'new_device_login', 'Alert on login from unrecognized device', 'warning', '{}'),
  ('New Country Login', 'new_country_login', 'Alert on login from new country', 'warning', '{}'),
  ('Brute Force Attempt', 'bruteforce_attempt', 'Alert on multiple failed login attempts', 'critical', '{"threshold": 5, "window_minutes": 15}'),
  ('SSL Expiry', 'ssl_expiry', 'Alert when SSL certificate is expiring soon', 'warning', '{"days_before": 30}'),
  ('Backup Failure', 'backup_failure', 'Alert when backup job fails', 'warning', '{"action": "failure", "resource_type": "backup"}'),
  ('Service Failure', 'service_failure', 'Alert when a service goes down', 'warning', '{"status": "error"}'),
  ('Unauthorized Access', 'unauthorized_access', 'Alert on unauthorized access attempts', 'critical', '{"result": "denied"}'),
  ('Suspicious Activity', 'suspicious_activity', 'Alert on anomalous behavior patterns', 'warning', '{}');