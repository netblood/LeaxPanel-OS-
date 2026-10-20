CREATE TABLE IF NOT EXISTS databases (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  host VARCHAR(255),
  port INTEGER,
  username VARCHAR(255),
  password_encrypted TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_databases_type ON databases(type);
CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(status);
