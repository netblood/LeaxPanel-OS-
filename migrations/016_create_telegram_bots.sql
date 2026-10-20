CREATE TABLE IF NOT EXISTS telegram_bots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  bot_token_encrypted TEXT,
  username VARCHAR(100),
  status VARCHAR(50) DEFAULT 'offline',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_status ON telegram_bots(status);
