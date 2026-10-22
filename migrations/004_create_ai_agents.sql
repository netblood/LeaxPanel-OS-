CREATE TABLE IF NOT EXISTS ai_agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT DEFAULT 'inactive',
  config TEXT DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT ((datetime('now'))),
  updated_at TEXT DEFAULT ((datetime('now')))
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);

