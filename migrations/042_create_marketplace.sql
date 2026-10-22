-- Template Marketplace - extend existing marketplace_items table
ALTER TABLE marketplace_items ADD COLUMN template_id TEXT;
ALTER TABLE marketplace_items ADD COLUMN author TEXT DEFAULT 'Community';
ALTER TABLE marketplace_items ADD COLUMN version TEXT DEFAULT '1.0.0';
ALTER TABLE marketplace_items ADD COLUMN rating REAL DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN reviews INTEGER DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN downloads INTEGER DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN popularity REAL DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN trust_score REAL DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN is_official INTEGER DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN tags TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE marketplace_items ADD COLUMN preview_url TEXT;
ALTER TABLE marketplace_items ADD COLUMN documentation_url TEXT;
ALTER TABLE marketplace_items ADD COLUMN changelog TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE marketplace_items ADD COLUMN min_resources TEXT DEFAULT '{}'; -- JSON: {cpu, memory, storage}
ALTER TABLE marketplace_items ADD COLUMN supported_providers TEXT DEFAULT '[]'; -- JSON array

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_template_id ON marketplace_items(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_verified ON marketplace_items(is_verified);
CREATE INDEX IF NOT EXISTS idx_marketplace_official ON marketplace_items(is_official);
CREATE INDEX IF NOT EXISTS idx_marketplace_popularity ON marketplace_items(popularity DESC);

-- Marketplace reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_template ON marketplace_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_user ON marketplace_reviews(user_id);

-- Marketplace blueprints (multi-service deployments)
CREATE TABLE IF NOT EXISTS marketplace_blueprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  author TEXT DEFAULT 'Community',
  version TEXT DEFAULT '1.0.0',
  services TEXT NOT NULL, -- JSON array of {template_id, service_type, config}
  rating REAL DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_official INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);