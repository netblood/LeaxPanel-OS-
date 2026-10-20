CREATE TABLE IF NOT EXISTS websites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inactive',
  platform VARCHAR(50) DEFAULT 'static',
  config JSONB DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);
