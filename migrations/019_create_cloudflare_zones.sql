CREATE TABLE IF NOT EXISTS cloudflare_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  zone_id TEXT,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'free',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_status ON cloudflare_zones(status);

