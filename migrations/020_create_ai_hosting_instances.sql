CREATE TABLE IF NOT EXISTS ai_hosting_instances (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'stopped',
  endpoint VARCHAR(500),
  api_key_encrypted TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_hosting_instances_status ON ai_hosting_instances(status);
