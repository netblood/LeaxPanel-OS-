CREATE TABLE IF NOT EXISTS ai_hosting_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT DEFAULT 'stopped',
  endpoint TEXT,
  api_key_encrypted TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_hosting_instances_status ON ai_hosting_instances(status);

