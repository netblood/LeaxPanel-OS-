CREATE TABLE IF NOT EXISTS file_manager_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT NOT NULL,
  size_bytes INTEGER DEFAULT 0,
  mime_type TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_manager_files_user_id ON file_manager_files(user_id);

