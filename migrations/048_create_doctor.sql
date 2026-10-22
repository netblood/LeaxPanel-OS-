-- LeaxPanel Doctor - Health checks and auto-fix tracking
CREATE TABLE IF NOT EXISTS doctor_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'routes', 'permissions', 'ssl', 'firewall', 'ports', 'storage', 'database', 'backups', 'services', 'logs', 'system'
  check_function TEXT NOT NULL, -- JS function name to execute
  fix_function TEXT, -- JS function name to auto-fix (nullable)
  is_critical INTEGER DEFAULT 0, -- critical checks affect overall health score more
  is_enabled INTEGER DEFAULT 1,
  run_interval_minutes INTEGER DEFAULT 60, -- how often to run automatically
  last_run_at TEXT,
  last_status TEXT, -- 'pass', 'fail', 'warning', 'error'
  last_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doctor_category ON doctor_checks(category);
CREATE INDEX IF NOT EXISTS idx_doctor_enabled ON doctor_checks(is_enabled);

-- Doctor scan history
CREATE TABLE IF NOT EXISTS doctor_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- null for automated scans
  trigger_type TEXT DEFAULT 'manual', -- 'manual', 'scheduled', 'webhook', 'api'
  total_checks INTEGER DEFAULT 0,
  passed_checks INTEGER DEFAULT 0,
  failed_checks INTEGER DEFAULT 0,
  warning_checks INTEGER DEFAULT 0,
  error_checks INTEGER DEFAULT 0,
  score REAL DEFAULT 100, -- 0-100 health score
  duration_ms INTEGER,
  results TEXT DEFAULT '[]', -- JSON array of check results
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doctor_scans_triggered ON doctor_scans(triggered_by);
CREATE INDEX IF NOT EXISTS idx_doctor_scans_created ON doctor_scans(created_at DESC);

-- Auto-fix history
CREATE TABLE IF NOT EXISTS doctor_fixes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER REFERENCES doctor_scans(id) ON DELETE SET NULL,
  check_id INTEGER REFERENCES doctor_checks(id) ON DELETE SET NULL,
  fix_function TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed'
  message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_doctor_fixes_scan ON doctor_fixes(scan_id);
CREATE INDEX IF NOT EXISTS idx_doctor_fixes_check ON doctor_fixes(check_id);

-- Insert default doctor checks
INSERT OR IGNORE INTO doctor_checks (name, label, description, category, check_function, fix_function, is_critical, run_interval_minutes) VALUES
  ('routes-health', 'Routes Health', 'Verify all registered routes respond correctly', 'routes', 'checkRoutesHealth', 'fixRoutesHealth', 1, 60),
  ('permissions-integrity', 'Permissions Integrity', 'Check RBAC permissions consistency', 'permissions', 'checkPermissionsIntegrity', 'fixPermissionsIntegrity', 1, 60),
  ('ssl-certificates', 'SSL Certificates', 'Verify SSL certificates are valid and not expiring', 'ssl', 'checkSSLCertificates', 'fixSSLCertificates', 1, 1440),
  ('firewall-rules', 'Firewall Rules', 'Validate firewall configuration', 'firewall', 'checkFirewallRules', 'fixFirewallRules', 1, 360),
  ('port-availability', 'Port Availability', 'Check for port conflicts and availability', 'ports', 'checkPortAvailability', 'fixPortAvailability', 0, 60),
  ('storage-capacity', 'Storage Capacity', 'Monitor disk space and storage quotas', 'storage', 'checkStorageCapacity', 'fixStorageCapacity', 1, 60),
  ('database-health', 'Database Health', 'Verify database connectivity and integrity', 'database', 'checkDatabaseHealth', 'fixDatabaseHealth', 1, 60),
  ('backup-status', 'Backup Status', 'Check recent backup success/failure', 'backups', 'checkBackupStatus', 'fixBackupStatus', 1, 360),
  ('service-status', 'Service Status', 'Verify all provisioned services are healthy', 'services', 'checkServiceStatus', 'fixServiceStatus', 1, 60),
  ('log-rotation', 'Log Rotation', 'Verify log files are rotated and not consuming excessive space', 'logs', 'checkLogRotation', 'fixLogRotation', 0, 1440),
  ('system-resources', 'System Resources', 'Check CPU, memory, and disk usage', 'system', 'checkSystemResources', 'fixSystemResources', 0, 60),
  ('workspaces-valid', 'Workspace Validity', 'Ensure all workspaces have valid configurations', 'system', 'checkWorkspacesValid', 'fixWorkspacesValid', 0, 360),
  ('dns-resolution', 'DNS Resolution', 'Verify domain DNS records resolve correctly', 'ssl', 'checkDNSResolution', 'fixDNSResolution', 0, 360),
  ('proxy-config', 'Proxy Configuration', 'Validate reverse proxy configs are valid', 'system', 'checkProxyConfig', 'fixProxyConfig', 0, 360),
  ('session-store', 'Session Store', 'Verify session store is healthy', 'system', 'checkSessionStore', 'fixSessionStore', 0, 60);