CREATE TABLE IF NOT EXISTS email_accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  config JSONB DEFAULT '{}',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_email_accounts_status ON email_accounts(status);
