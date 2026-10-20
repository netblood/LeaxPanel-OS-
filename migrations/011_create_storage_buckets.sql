CREATE TABLE IF NOT EXISTS storage_buckets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100) DEFAULT 'us-east-1',
  status VARCHAR(50) DEFAULT 'active',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_buckets_status ON storage_buckets(status);
