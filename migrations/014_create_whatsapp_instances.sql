CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  session_data TEXT DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

