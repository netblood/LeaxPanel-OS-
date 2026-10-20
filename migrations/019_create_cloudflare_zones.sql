CREATE TABLE IF NOT EXISTS cloudflare_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  zone_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  plan VARCHAR(50) DEFAULT 'free',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_status ON cloudflare_zones(status);
