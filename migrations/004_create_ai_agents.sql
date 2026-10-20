CREATE TABLE IF NOT EXISTS ai_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'inactive',
  config JSONB DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
