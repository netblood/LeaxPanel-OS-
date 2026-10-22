-- AI Agents - extend existing ai_agents table
ALTER TABLE ai_agents ADD COLUMN label TEXT;
ALTER TABLE ai_agents ADD COLUMN description TEXT;
ALTER TABLE ai_agents ADD COLUMN system_prompt TEXT;
ALTER TABLE ai_agents ADD COLUMN capabilities TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE ai_agents ADD COLUMN provider_id INTEGER REFERENCES ai_settings(id) ON DELETE SET NULL;
ALTER TABLE ai_agents ADD COLUMN temperature REAL DEFAULT 0.7;
ALTER TABLE ai_agents ADD COLUMN max_tokens INTEGER DEFAULT 4096;
ALTER TABLE ai_agents ADD COLUMN knowledge_base_ids TEXT DEFAULT '[]'; -- JSON array of knowledge base IDs
ALTER TABLE ai_agents ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE ai_agents ADD COLUMN is_default INTEGER DEFAULT 0;

UPDATE ai_agents SET label = name WHERE label IS NULL;
UPDATE ai_agents SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END;

CREATE INDEX IF NOT EXISTS idx_ai_agents_user ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);

-- AI Agent conversations/history
CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  messages TEXT DEFAULT '[]', -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_convs_agent ON ai_agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_convs_user ON ai_agent_conversations(user_id);

-- AI Hosting instances
CREATE TABLE IF NOT EXISTS ai_hosting_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ollama', 'vllm', 'tgi', 'custom'
  model TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'stopped', 'error'
  config TEXT DEFAULT '{}', -- JSON
  port INTEGER,
  domain TEXT,
  gpu_enabled INTEGER DEFAULT 0,
  memory_limit TEXT, -- e.g., '8Gi'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_hosting_user ON ai_hosting_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hosting_status ON ai_hosting_instances(status);