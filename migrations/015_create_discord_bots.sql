CREATE TABLE IF NOT EXISTS discord_bots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  bot_token_encrypted TEXT,
  status VARCHAR(50) DEFAULT 'offline',
  guild_count INTEGER DEFAULT 0,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discord_bots_status ON discord_bots(status);
