-- Application hosting: NodeJS / PHP / WordPress / Docker deployments.
CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'nodejs',
  runtime TEXT,
  version TEXT,
  domain TEXT,
  root_path TEXT NOT NULL DEFAULT '/',
  entrypoint TEXT,
  build_command TEXT,
  start_command TEXT,
  install_command TEXT,
  port INTEGER DEFAULT 3000,
  status TEXT DEFAULT 'stopped',
  process_id INTEGER,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  env_vars TEXT DEFAULT '{}',
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_type ON apps(type);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);

-- Environment variables for hosted applications.
CREATE TABLE IF NOT EXISTS app_env_vars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  is_secret INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_env_vars_app_id ON app_env_vars(app_id);
