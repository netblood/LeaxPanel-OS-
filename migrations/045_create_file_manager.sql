-- Extend file_manager_files table
ALTER TABLE file_manager_files ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE file_manager_files ADD COLUMN project_id INTEGER;
ALTER TABLE file_manager_files ADD COLUMN project_type TEXT;
ALTER TABLE file_manager_files ADD COLUMN path TEXT;
ALTER TABLE file_manager_files ADD COLUMN type TEXT DEFAULT 'file';
ALTER TABLE file_manager_files ADD COLUMN encoding TEXT DEFAULT 'utf-8';
ALTER TABLE file_manager_files ADD COLUMN permissions TEXT DEFAULT 'rw-r--r--';
ALTER TABLE file_manager_files ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE file_manager_files ADD COLUMN is_hidden INTEGER DEFAULT 0;
ALTER TABLE file_manager_files ADD COLUMN deleted_at TEXT;

UPDATE file_manager_files SET path = file_path WHERE path IS NULL;
UPDATE file_manager_files SET type = 'file' WHERE type IS NULL;
UPDATE file_manager_files SET permissions = 'rw-r--r--' WHERE permissions IS NULL;

CREATE INDEX IF NOT EXISTS idx_fm_files_workspace ON file_manager_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fm_files_project ON file_manager_files(project_type, project_id);
CREATE INDEX IF NOT EXISTS idx_fm_files_path ON file_manager_files(path);
CREATE INDEX IF NOT EXISTS idx_fm_files_deleted ON file_manager_files(deleted_at);

-- File manager sessions
CREATE TABLE IF NOT EXISTS file_manager_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id INTEGER NOT NULL REFERENCES file_manager_files(id) ON DELETE CASCADE,
  cursor_position TEXT,
  selection TEXT,
  last_activity TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fm_sessions_user ON file_manager_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fm_sessions_file ON file_manager_sessions(file_id);

-- Terminal command history
CREATE TABLE IF NOT EXISTS terminal_command_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES terminal_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  output TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,
  working_dir TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_term_hist_session ON terminal_command_history(session_id);
CREATE INDEX IF NOT EXISTS idx_term_hist_user ON terminal_command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_term_hist_created ON terminal_command_history(created_at);

-- Terminal permissions
CREATE TABLE IF NOT EXISTS terminal_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id INTEGER,
  project_type TEXT,
  allowed_commands TEXT DEFAULT '[]', -- JSON array
  denied_commands TEXT DEFAULT '[]',
  max_sessions INTEGER DEFAULT 5,
  session_timeout INTEGER DEFAULT 3600,
  require_approval INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_term_perm_user ON terminal_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_term_perm_workspace ON terminal_permissions(workspace_id);