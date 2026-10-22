const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const logger = require('../utils/logger');

function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function maskKey(raw) {
  if (!raw) return '';
  return `${String(raw).slice(0, 10)}${'•'.repeat(12)}${String(raw).slice(-4)}`;
}

router.get('/', (req, res) => {
  try {
    const keys = db.all(
      'SELECT id, name, permissions, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.render('apiKeys/index', {
      title: 'API Keys',
      pageTitle: 'API Keys',
      pageSubtitle: 'Programmatic access to the LeaxPanel REST API',
      keys,
      rows: keys
    });
  } catch (err) {
    logger.error('API keys error:', err);
    res.render('apiKeys/index', { title: 'API Keys', pageTitle: 'API Keys', keys: [], rows: [] });
  }
});

router.post('/create', handleValidationErrors, (req, res) => {
  try {
    const name = String(req.body.name || '').trim() || 'Untitled key';
    const permissions = String(req.body.permissions || 'read').split(',').map(p => p.trim()).filter(Boolean);
    const raw = `lx_${crypto.randomBytes(24).toString('hex')}`;

    db.run(
      "INSERT INTO api_keys (user_id, name, key_hash, permissions, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [req.session.user.id, name, hashKey(raw), JSON.stringify(permissions)]
    );

    req.flash('success', `API key created: ${maskKey(raw)} — copy it now, it will not be shown again.`);
    req.session.newApiKey = raw;
    res.redirect('/apikeys');
  } catch (err) {
    logger.error('Create API key error:', err);
    req.flash('error', `Failed to create API key: ${err.message}`);
    res.redirect('/apikeys');
  }
});

router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    db.run('DELETE FROM api_keys WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.flash('success', 'API key revoked.');
  } catch (err) {
    req.flash('error', 'Failed to revoke API key.');
  }
  res.redirect('/apikeys');
});

router.get('/usage', (req, res) => {
  try {
    const usage = db.all(
      `SELECT u.*, k.name AS key_name FROM api_usage_log u
       LEFT JOIN api_keys k ON k.id = u.api_key_id
       WHERE u.user_id = ? ORDER BY u.created_at DESC LIMIT 100`,
      [req.session.user.id]
    );
    res.render('apiKeys/usage', { title: 'API Usage', pageTitle: 'API Usage', usage, rows: usage });
  } catch (err) {
    logger.error('API usage error:', err);
    res.render('apiKeys/usage', { title: 'API Usage', pageTitle: 'API Usage', usage: [], rows: [] });
  }
});

module.exports = router;
module.exports.hashKey = hashKey;
module.exports.maskKey = maskKey;
