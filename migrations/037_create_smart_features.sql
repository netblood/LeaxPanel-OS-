-- Smart Port Manager: port allocation, reservation, conflict detection.
CREATE TABLE IF NOT EXISTS service_ports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  protocol TEXT DEFAULT 'tcp',
  allocated_at TEXT DEFAULT (datetime('now')),
  released_at TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_ports_port ON service_ports(port);
CREATE INDEX IF NOT EXISTS idx_service_ports_service ON service_ports(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_service_ports_allocated ON service_ports(allocated_at);

-- Smart Domain Manager: auto subdomain generation, DNS provisioning.
CREATE TABLE IF NOT EXISTS service_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  full_domain TEXT NOT NULL UNIQUE,
  platform_domain TEXT NOT NULL,
  dns_provider TEXT DEFAULT 'cloudflare',
  dns_status TEXT DEFAULT 'pending',
  ssl_status TEXT DEFAULT 'pending',
  ssl_auto_renew INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_domains_full ON service_domains(full_domain);
CREATE INDEX IF NOT EXISTS idx_service_domains_service ON service_domains(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_service_domains_platform ON service_domains(platform_domain);

-- Smart Reverse Proxy: auto proxy configuration per service.
CREATE TABLE IF NOT EXISTS proxy_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  target_port INTEGER NOT NULL,
  config_type TEXT DEFAULT 'nginx',
  ssl_enabled INTEGER DEFAULT 1,
  headers TEXT DEFAULT '{}',
  caching INTEGER DEFAULT 1,
  compression INTEGER DEFAULT 1,
  health_check_path TEXT DEFAULT '/health',
  health_check_interval INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proxy_configs_source ON proxy_configs(source_domain);
CREATE INDEX IF NOT EXISTS idx_proxy_configs_service ON proxy_configs(service_type, service_id);

-- Smart Service Provisioning: unified deployment tracking.
CREATE TABLE IF NOT EXISTS service_provisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  template_name TEXT,
  blueprint_name TEXT,
  status TEXT DEFAULT 'provisioning',
  folder_path TEXT,
  env_path TEXT,
  port INTEGER,
  domain TEXT,
  ssl_cert_id INTEGER,
  proxy_config_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (ssl_cert_id) REFERENCES ssl_certificates(id) ON DELETE SET NULL,
  FOREIGN KEY (proxy_config_id) REFERENCES proxy_configs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_provisions_status ON service_provisions(status);
CREATE INDEX IF NOT EXISTS idx_service_provisions_service ON service_provisions(service_type, service_id);

-- Smart Setup Wizard: persistence across steps.
CREATE TABLE IF NOT EXISTS setup_wizard_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step TEXT NOT NULL DEFAULT 'system_scan',
  data TEXT DEFAULT '{}',
  completed INTEGER DEFAULT 0,
  owner_email TEXT,
  owner_name TEXT,
  platform_domain TEXT,
  cloudflare_token TEXT,
  cloudflare_zone_id TEXT,
  auto_ssl INTEGER DEFAULT 1,
  auto_dns INTEGER DEFAULT 1,
  auto_backup INTEGER DEFAULT 1,
  auto_monitoring INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_setup_wizard_state_step ON setup_wizard_state(step);

-- Cloudflare zone extensions: auto DNS management.
CREATE TABLE IF NOT EXISTS cloudflare_auto_dns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id TEXT NOT NULL,
  record_name TEXT NOT NULL,
  record_type TEXT DEFAULT 'CNAME',
  record_value TEXT NOT NULL,
  proxied INTEGER DEFAULT 1,
  ttl INTEGER DEFAULT 1,
  service_type TEXT,
  service_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cf_auto_dns_zone ON cloudflare_auto_dns(zone_id);
CREATE INDEX IF NOT EXISTS idx_cf_auto_dns_service ON cloudflare_auto_dns(service_type, service_id);
