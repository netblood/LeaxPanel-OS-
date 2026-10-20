CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
