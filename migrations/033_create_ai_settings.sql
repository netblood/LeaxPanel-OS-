-- Per-user AI provider configuration (Bring Your Own AI).
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  name TEXT,
  base_url TEXT,
  api_key_encrypted TEXT,
  model TEXT,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);

-- Knowledge bases attached to AI agents.
CREATE TABLE IF NOT EXISTS ai_knowledge_bases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER REFERENCES ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'processing',
  chunk_count INTEGER DEFAULT 0,
  embedding_model TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_bases_agent_id ON ai_knowledge_bases(agent_id);

-- Documents uploaded into a knowledge base.
CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id INTEGER NOT NULL REFERENCES ai_knowledge_bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT,
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_kb_id ON ai_knowledge_documents(knowledge_base_id);
