-- Extended services table with categories, resource limits, templates
CREATE TABLE IF NOT EXISTS service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  template_id TEXT,
  resource_limits TEXT DEFAULT '{}', -- JSON: {cpu, memory, storage, ports}
  config_schema TEXT DEFAULT '{}', -- JSON schema for service config
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert service categories
INSERT OR IGNORE INTO service_categories (name, label, description, icon, sort_order) VALUES
  ('websites', 'Websites', 'WordPress, WooCommerce, PHP, Laravel, Static sites', '🌐', 1),
  ('apps', 'Applications', 'NodeJS, Express, NestJS, Fastify, Go, Python, Docker', '📦', 2),
  ('bots', 'Bots', 'Telegram, Discord, WhatsApp, Slack bots', '🤖', 3),
  ('ai-agents', 'AI Agents', 'Support, DevOps, Security, Marketing, Sales, Coding agents', '✨', 4),
  ('workflows', 'Workflows', 'N8N automation workflows', '🔄', 5),
  ('databases', 'Databases', 'PostgreSQL, MySQL, MongoDB, Redis, SQLite', '🗄️', 6),
  ('email', 'Email', 'SMTP, IMAP, Gmail, Outlook, Custom providers', '📧', 7),
  ('storage', 'Storage', 'Object storage, S3 compatible, local buckets', '💾', 8),
  ('domains', 'Domains', 'Domain registration, DNS management, SSL certificates', '🌍', 9);

-- Insert service types for Websites
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (1, 'wordpress', 'WordPress', 'CMS, blogs, business sites', '📝', 'wordpress-starter', '{"cpu": "1000m", "memory": "512Mi", "storage": "2Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "admin_email": {"type": "string"}, "admin_user": {"type": "string"}, "admin_pass": {"type": "string"}, "wp_version": {"type": "string"}}}'),
  (1, 'woocommerce', 'WooCommerce', 'E-commerce stores', '🛒', 'woocommerce-starter', '{"cpu": "2000m", "memory": "1Gi", "storage": "5Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "admin_email": {"type": "string"}, "admin_user": {"type": "string"}, "admin_pass": {"type": "string"}, "wc_version": {"type": "string"}}}'),
  (1, 'php', 'PHP Application', 'Laravel, Symfony, CodeIgniter', '🐘', 'php-starter', '{"cpu": "500m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "php_version": {"type": "string"}, "framework": {"type": "string"}, "entrypoint": {"type": "string"}}}'),
  (1, 'laravel', 'Laravel', 'Modern PHP framework', '🔺', 'laravel-starter', '{"cpu": "1000m", "memory": "512Mi", "storage": "2Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "php_version": {"type": "string"}, "laravel_version": {"type": "string"}, "app_key": {"type": "string"}}}'),
  (1, 'static', 'Static Site', 'HTML, React, Vue, Next.js export', '📄', 'html-starter', '{"cpu": "100m", "memory": "64Mi", "storage": "512Mi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "build_command": {"type": "string"}, "output_dir": {"type": "string"}}}');

-- Insert service types for Applications
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (2, 'nodejs', 'NodeJS', 'JavaScript runtime', '📦', 'nodejs-starter', '{"cpu": "500m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "node_version": {"type": "string"}, "start_command": {"type": "string"}, "install_command": {"type": "string"}}}'),
  (2, 'express', 'Express', 'Fast, unopinionated web framework', '🚂', 'express-starter', '{"cpu": "500m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "node_version": {"type": "string"}, "start_command": {"type": "string"}}}'),
  (2, 'nestjs', 'NestJS', 'Scalable Node.js framework', '🏗️', 'nestjs-starter', '{"cpu": "1000m", "memory": "512Mi", "storage": "2Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "node_version": {"type": "string"}, "start_command": {"type": "string"}}}'),
  (2, 'fastify', 'Fastify', 'Fast and low overhead', '⚡', 'fastify-starter', '{"cpu": "500m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "node_version": {"type": "string"}, "start_command": {"type": "string"}}}'),
  (2, 'go', 'Go Application', 'Golang services', '🐹', 'go-starter', '{"cpu": "500m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "go_version": {"type": "string"}, "build_command": {"type": "string"}, "binary_name": {"type": "string"}}}'),
  (2, 'python', 'Python Application', 'FastAPI, Flask, Django', '🐍', 'python-starter', '{"cpu": "500m", "memory": "512Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "python_version": {"type": "string"}, "framework": {"type": "string"}, "start_command": {"type": "string"}, "requirements_file": {"type": "string"}}}'),
  (2, 'docker', 'Docker Container', 'Any containerized app', '🐳', 'docker-starter', '{"cpu": "1000m", "memory": "512Mi", "storage": "2Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "image": {"type": "string"}, "port": {"type": "integer"}, "env_vars": {"type": "object"}}}');

-- Insert service types for Bots
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (3, 'telegram', 'Telegram Bot', 'BotFather integration', '✈️', 'telegram-bot-starter', '{"cpu": "100m", "memory": "128Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"bot_token": {"type": "string"}, "webhook_url": {"type": "string"}}}'),
  (3, 'discord', 'Discord Bot', 'Gateway & REST API', '🎮', 'discord-bot-starter', '{"cpu": "100m", "memory": "128Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"bot_token": {"type": "string"}, "client_id": {"type": "string"}, "guild_id": {"type": "string"}}}'),
  (3, 'whatsapp', 'WhatsApp', 'Evolution API / WAHA / Baileys', '📱', 'whatsapp-starter', '{"cpu": "500m", "memory": "512Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"provider": {"type": "string"}, "api_url": {"type": "string"}, "api_key": {"type": "string"}}}'),
  (3, 'slack', 'Slack Bot', 'Bolt framework', '💬', 'slack-bot-starter', '{"cpu": "100m", "memory": "128Mi", "storage": "512Mi", "ports": 1}', '{"type": "object", "properties": {"bot_token": {"type": "string"}, "signing_secret": {"type": "string"}, "app_token": {"type": "string"}}}');

-- Insert service types for AI Agents
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (4, 'support-agent', 'Support Agent', 'Customer support automation', '🎧', 'support-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}'),
  (4, 'devops-agent', 'DevOps Agent', 'Infrastructure automation', '⚙️', 'devops-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}'),
  (4, 'security-agent', 'Security Agent', 'Threat detection & response', '🛡️', 'security-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}'),
  (4, 'marketing-agent', 'Marketing Agent', 'Content & campaigns', '📢', 'marketing-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}'),
  (4, 'sales-agent', 'Sales Agent', 'Lead qualification & outreach', '💼', 'sales-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}'),
  (4, 'coding-agent', 'Developer Agent', 'Code generation & review', '💻', 'coding-agent-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "512Mi", "ports": 0}', '{"type": "object", "properties": {"provider": {"type": "string"}, "model": {"type": "string"}, "system_prompt": {"type": "string"}, "knowledge_base_id": {"type": "integer"}, "temperature": {"type": "number"}}}');

-- Insert service types for Workflows
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (5, 'n8n', 'N8N', 'Visual workflow automation', '🔄', 'n8n-starter', '{"cpu": "1000m", "memory": "1Gi", "storage": "2Gi", "ports": 1}', '{"type": "object", "properties": {"domain": {"type": "string"}, "n8n_version": {"type": "string"}, "encryption_key": {"type": "string"}, "webhook_url": {"type": "string"}}}');

-- Insert service types for Databases
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (6, 'postgresql', 'PostgreSQL', 'Advanced open source DB', '🐘', 'postgresql-starter', '{"cpu": "500m", "memory": "512Mi", "storage": "5Gi", "ports": 1}', '{"type": "object", "properties": {"version": {"type": "string"}, "database": {"type": "string"}, "username": {"type": "string"}, "password": {"type": "string"}}}'),
  (6, 'mysql', 'MySQL', 'Popular relational DB', '🐬', 'mysql-starter', '{"cpu": "500m", "memory": "512Mi", "storage": "5Gi", "ports": 1}', '{"type": "object", "properties": {"version": {"type": "string"}, "database": {"type": "string"}, "username": {"type": "string"}, "password": {"type": "string"}}}'),
  (6, 'mongodb', 'MongoDB', 'Document database', '🍃', 'mongodb-starter', '{"cpu": "500m", "memory": "512Mi", "storage": "5Gi", "ports": 1}', '{"type": "object", "properties": {"version": {"type": "string"}, "database": {"type": "string"}, "username": {"type": "string"}, "password": {"type": "string"}}}'),
  (6, 'redis', 'Redis', 'In-memory data store', '🔴', 'redis-starter', '{"cpu": "200m", "memory": "256Mi", "storage": "1Gi", "ports": 1}', '{"type": "object", "properties": {"version": {"type": "string"}, "password": {"type": "string"}}}'),
  (6, 'sqlite', 'SQLite', 'Embedded database', '💎', 'sqlite-starter', '{"cpu": "50m", "memory": "64Mi", "storage": "1Gi", "ports": 0}', '{"type": "object", "properties": {"database": {"type": "string"}}}');

-- Insert service types for Email
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (7, 'email', 'Email Account', 'Mailbox with IMAP/SMTP', '📧', 'email-starter', '{"cpu": "100m", "memory": "128Mi", "storage": "1Gi", "ports": 2}', '{"type": "object", "properties": {"domain": {"type": "string"}, "username": {"type": "string"}, "password": {"type": "string"}, "quota": {"type": "integer"}}}');

-- Insert service types for Storage
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (8, 'storage', 'Storage Bucket', 'S3-compatible object storage', '💾', 'storage-starter', '{"cpu": "100m", "memory": "128Mi", "storage": "10Gi", "ports": 1}', '{"type": "object", "properties": {"bucket_name": {"type": "string"}, "public_read": {"type": "boolean"}, "versioning": {"type": "boolean"}}}');

-- Insert service types for Domains
INSERT OR IGNORE INTO service_types (category_id, name, label, description, icon, template_id, resource_limits, config_schema) VALUES
  (9, 'domain', 'Domain', 'Register & manage domains', '🌍', 'domain-starter', '{"cpu": "10m", "memory": "32Mi", "storage": "10Mi", "ports": 0}', '{"type": "object", "properties": {"domain": {"type": "string"}, "nameservers": {"type": "array", "items": {"type": "string"}}, "auto_ssl": {"type": "boolean"}}}');