-- DNS records and SSL certificates for the Domain Center.
CREATE TABLE IF NOT EXISTS dns_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'A',
  name TEXT NOT NULL DEFAULT '@',
  value TEXT NOT NULL,
  ttl INTEGER DEFAULT 3600,
  priority INTEGER,
  proxied INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dns_records_domain_id ON dns_records(domain_id);

CREATE TABLE IF NOT EXISTS ssl_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'letsencrypt',
  status TEXT DEFAULT 'pending',
  issuer TEXT,
  serial TEXT,
  valid_from TEXT,
  valid_to TEXT,
  auto_renew INTEGER DEFAULT 1,
  cert_path TEXT,
  key_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain_id ON ssl_certificates(domain_id);
