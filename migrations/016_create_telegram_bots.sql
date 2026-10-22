CREATE TABLE IF NOT EXISTS telegram_bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bot_token_encrypted TEXT,
  username TEXT,
  status TEXT DEFAULT 'offline',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_status ON telegram_bots(status);

