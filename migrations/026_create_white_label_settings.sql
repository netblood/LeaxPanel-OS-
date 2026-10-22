CREATE TABLE IF NOT EXISTS white_label_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

