CREATE TABLE IF NOT EXISTS discord_bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bot_token_encrypted TEXT,
  status TEXT DEFAULT 'offline',
  guild_count INTEGER DEFAULT 0,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discord_bots_status ON discord_bots(status);

