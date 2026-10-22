-- Support ticket threads for the Request Center.
CREATE TABLE IF NOT EXISTS request_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_staff INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_request_messages_request_id ON request_messages(request_id);

-- Snapshot / restore point catalogue for the Backup Center.
CREATE TABLE IF NOT EXISTS backup_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_id INTEGER REFERENCES backups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  scope TEXT DEFAULT 'system',
  status TEXT DEFAULT 'pending',
  size_bytes INTEGER DEFAULT 0,
  manifest TEXT DEFAULT '{}',
  restore_point TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_backup_snapshots_status ON backup_snapshots(status);
