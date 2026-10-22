CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

