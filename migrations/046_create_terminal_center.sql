-- Extend terminal_sessions table
ALTER TABLE terminal_sessions ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE terminal_sessions ADD COLUMN project_id INTEGER;
ALTER TABLE terminal_sessions ADD COLUMN project_type TEXT;
ALTER TABLE terminal_sessions ADD COLUMN env_vars TEXT DEFAULT '{}';
ALTER TABLE terminal_sessions ADD COLUMN pid INTEGER;
ALTER TABLE terminal_sessions ADD COLUMN ended_at TEXT;

UPDATE terminal_sessions SET project_type = 'workspace' WHERE project_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_terminal_workspace ON terminal_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_terminal_project ON terminal_sessions(project_type, project_id);

-- Terminal command history (audit)
CREATE TABLE IF NOT EXISTS terminal_command_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES terminal_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  exit_code INTEGER,
  output TEXT,
  duration_ms INTEGER,
  working_directory TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_terminal_history_session ON terminal_command_history(session_id);
CREATE INDEX IF NOT EXISTS idx_terminal_history_user ON terminal_command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_history_created ON terminal_command_history(created_at);

-- Terminal permissions
CREATE TABLE IF NOT EXISTS terminal_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id INTEGER,
  project_type TEXT,
  allowed_commands TEXT DEFAULT '[]',
  denied_commands TEXT DEFAULT '[]',
  max_sessions INTEGER DEFAULT 5,
  session_timeout INTEGER DEFAULT 3600,
  require_approval INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_term_perm_user ON terminal_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_term_perm_workspace ON terminal_permissions(workspace_id);