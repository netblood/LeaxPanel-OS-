-- Create terminal sessions table
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Terminal',
  path TEXT NOT NULL DEFAULT '/workspace',
  shell TEXT NOT NULL DEFAULT 'bash',
  cols INTEGER NOT NULL DEFAULT 120,
  rows INTEGER NOT NULL DEFAULT 30,
  audited INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_status ON terminal_sessions(status);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_created_at ON terminal_sessions(created_at);

-- Create terminal audit table for command logging
CREATE TABLE IF NOT EXISTS terminal_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES terminal_sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  output TEXT,
  exit_code INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terminal_audit_session_id ON terminal_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_terminal_audit_user_id ON terminal_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_audit_created_at ON terminal_audit(created_at);
