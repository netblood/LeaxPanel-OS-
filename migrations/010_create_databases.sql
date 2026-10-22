CREATE TABLE IF NOT EXISTS databases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  host TEXT,
  port INTEGER,
  username TEXT,
  password_encrypted TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_databases_type ON databases(type);
CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(status);

