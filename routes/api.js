// Public REST API.
// Authentication: session cookie OR an `X-API-Key` header.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { apiLimiter } = require('../config/security');
const logger = require('../utils/logger');

function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function authenticate(req, res, next) {
  const raw = req.get('x-api-key') || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (req.session && req.session.user) {
    req.apiUser = req.session.user;
    req.apiKeyId = null;
    return next();
  }

  if (!raw) {
    return res.status(401).json({ error: 'Authentication required', hint: 'Send an X-API-Key header' });
  }

  const row = db.get('SELECT * FROM api_keys WHERE key_hash = ?', [hashKey(raw)]);
  if (!row) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  db.run("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?", [row.id]);
  req.apiKeyId = row.id;
  req.apiUser = db.get('SELECT id, name, email, role FROM users WHERE id = ?', [row.user_id]) || { id: row.user_id };
  return next();
}

function logUsage(req, statusCode, durationMs) {
  if (!req.apiKeyId) return;
  try {
    db.run(
      `INSERT INTO api_usage_log (api_key_id, user_id, method, endpoint, status_code, duration_ms, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [req.apiKeyId, req.apiUser ? req.apiUser.id : null, req.method, req.originalUrl, statusCode, durationMs, req.ip]
    );
  } catch (err) {
    logger.warn('API usage log failed:', err.message);
  }
}

router.use(apiLimiter);
router.use(authenticate);
router.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => logUsage(req, res.statusCode, Date.now() - started));
  next();
});

/* ---------------------------------------------------------------- public */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', (req, res) => {
  try {
    const tables = ['users', 'services', 'apps', 'websites', 'databases', 'bots', 'n8n_workflows', 'domains'];
    const stats = {};
    for (const table of tables) {
      const row = db.get(`SELECT COUNT(*) AS count FROM ${table}`);
      stats[table] = row ? row.count : 0;
    }
    res.json({ stats, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('API stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/* ------------------------------------------------------------ resources */
const RESOURCES = {
  users: { table: 'users', columns: 'id, name, email, role, is_active, email_verified, two_factor_enabled, created_at' },
  services: { table: 'services', columns: '*' },
  apps: { table: 'apps', columns: '*' },
  websites: { table: 'websites', columns: '*' },
  databases: { table: 'databases', columns: '*' },
  domains: { table: 'domains', columns: '*' },
  bots: { table: 'bots', columns: '*' },
  workflows: { table: 'n8n_workflows', columns: '*' },
  agents: { table: 'ai_agents', columns: '*' },
  backups: { table: 'backups', columns: '*' },
  invoices: { table: 'invoices', columns: '*' },
  requests: { table: 'requests', columns: '*' },
  notifications: { table: 'notifications', columns: '*' },
  dns_records: { table: 'dns_records', columns: '*' },
  ssl_certificates: { table: 'ssl_certificates', columns: '*' },
  webhooks: { table: 'webhooks', columns: '*' }
};

const MUTABLE = {
  users: ['name', 'email', 'role', 'is_active'],
  services: ['name', 'type', 'status', 'config'],
  apps: ['name', 'type', 'runtime', 'version', 'domain', 'root_path', 'entrypoint', 'start_command', 'install_command', 'build_command', 'port', 'status', 'env_vars', 'config'],
  websites: ['name', 'domain', 'platform', 'status', 'config'],
  databases: ['name', 'type', 'host', 'port', 'username', 'status'],
  domains: ['name', 'status', 'dns_records'],
  bots: ['name', 'type', 'status', 'config'],
  workflows: ['name', 'status', 'workflow_data'],
  agents: ['name', 'type', 'model', 'status', 'config'],
  backups: ['name', 'type', 'status'],
  invoices: ['invoice_number', 'customer_name', 'amount', 'currency', 'status'],
  requests: ['subject', 'description', 'status', 'priority'],
  notifications: ['title', 'message', 'type', 'is_read'],
  dns_records: ['domain_id', 'type', 'name', 'value', 'ttl', 'priority', 'proxied'],
  ssl_certificates: ['domain_id', 'provider', 'status', 'issuer', 'serial', 'valid_from', 'valid_to', 'auto_renew'],
  webhooks: ['name', 'target_url', 'method', 'events', 'secret', 'status']
};

router.get('/resources', (req, res) => {
  res.json({ resources: Object.keys(RESOURCES) });
});

router.get('/:resource', (req, res) => {
  const config = RESOURCES[req.params.resource];
  if (!config) return res.status(404).json({ error: `Unknown resource "${req.params.resource}"` });

  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const rows = db.all(`SELECT ${config.columns} FROM ${config.table} ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]);
    const total = db.get(`SELECT COUNT(*) AS count FROM ${config.table}`);
    res.json({ data: rows, total: total ? total.count : 0, limit, offset });
  } catch (err) {
    logger.error(`API list ${req.params.resource} error:`, err);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

router.get('/:resource/:id', (req, res) => {
  const config = RESOURCES[req.params.resource];
  if (!config) return res.status(404).json({ error: `Unknown resource "${req.params.resource}"` });

  try {
    const row = db.get(`SELECT ${config.columns} FROM ${config.table} WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json({ data: row });
  } catch (err) {
    logger.error(`API get ${req.params.resource} error:`, err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

router.post('/:resource', (req, res) => {
  const config = RESOURCES[req.params.resource];
  const allowed = MUTABLE[req.params.resource];
  if (!config || !allowed) return res.status(404).json({ error: `Unknown resource "${req.params.resource}"` });

  try {
    const data = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No writable fields supplied', allowed });
    }

    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${config.table} (${keys.join(', ')}, created_at) VALUES (${placeholders}, datetime('now'))`;
    const result = db.run(sql, keys.map(k => data[k]));

    const row = db.get(`SELECT ${config.columns} FROM ${config.table} WHERE id = ?`, [result.lastInsertRowid]);
    res.status(201).json({ data: row });
  } catch (err) {
    logger.error(`API create ${req.params.resource} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:resource/:id', (req, res) => {
  const config = RESOURCES[req.params.resource];
  const allowed = MUTABLE[req.params.resource];
  if (!config || !allowed) return res.status(404).json({ error: `Unknown resource "${req.params.resource}"` });

  try {
    const existing = db.get(`SELECT id FROM ${config.table} WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const data = {};
    for (const key of allowed) {
      if (key in req.body) data[key] = req.body[key];
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No writable fields supplied', allowed });
    }

    const keys = Object.keys(data);
    const assignments = keys.map(k => `${k} = ?`).join(', ');
    db.run(`UPDATE ${config.table} SET ${assignments} WHERE id = ?`, [...keys.map(k => data[k]), req.params.id]);

    const row = db.get(`SELECT ${config.columns} FROM ${config.table} WHERE id = ?`, [req.params.id]);
    res.json({ data: row });
  } catch (err) {
    logger.error(`API update ${req.params.resource} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:resource/:id', (req, res) => {
  const config = RESOURCES[req.params.resource];
  if (!config) return res.status(404).json({ error: `Unknown resource "${req.params.resource}"` });

  try {
    const existing = db.get(`SELECT id FROM ${config.table} WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Record not found' });
    db.run(`DELETE FROM ${config.table} WHERE id = ?`, [req.params.id]);
    res.json({ deleted: true, id: Number(req.params.id) });
  } catch (err) {
    logger.error(`API delete ${req.params.resource} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Template preview endpoint
router.get('/templates/:name/preview', async (req, res) => {
  try {
    const templates = require('../templates');
    const template = templates.getTemplate(req.params.name);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found', available: templates.listTemplates() });
    }
    
    // Return the template files for preview
    res.json({
      id: req.params.name,
      name: template.name,
      description: template.description,
      files: template.files,
      readme: template.files['README.md'] || ''
    });
  } catch (err) {
    logger.error('Template preview error:', err);
    res.status(500).json({ error: 'Failed to load template preview' });
  }
});

// List all available templates
router.get('/templates', (req, res) => {
  try {
    const templates = require('../templates');
    res.json({ templates: templates.listTemplates() });
  } catch (err) {
    logger.error('Template list error:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

module.exports = router;
module.exports.RESOURCES = RESOURCES;
