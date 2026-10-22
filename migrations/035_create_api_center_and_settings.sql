-- Custom API Center: API keys, webhooks and usage analytics.
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  method TEXT,
  endpoint TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_usage_log_key_id ON api_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created_at ON api_usage_log(created_at);

CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  events TEXT DEFAULT '[]',
  secret TEXT,
  status TEXT DEFAULT 'active',
  last_triggered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);

-- Service requests (managed hosting request flow).
CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_type TEXT NOT NULL,
  plan TEXT,
  domain TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resource_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- IP allow / block lists for the Security Center.
CREATE TABLE IF NOT EXISTS ip_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE,
  list_type TEXT NOT NULL DEFAULT 'whitelist',
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_lists_type ON ip_lists(list_type);

-- Panel-wide settings (Settings Center).
CREATE TABLE IF NOT EXISTS panel_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',
  `group` TEXT DEFAULT 'general',
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_panel_settings_group ON panel_settings(`group`);
