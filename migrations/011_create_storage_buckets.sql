CREATE TABLE IF NOT EXISTS storage_buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  region TEXT DEFAULT 'us-east-1',
  status TEXT DEFAULT 'active',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_storage_buckets_status ON storage_buckets(status);

