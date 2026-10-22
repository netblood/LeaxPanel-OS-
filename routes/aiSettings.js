const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { maskSecret } = require('../utils/helpers');
const logger = require('../utils/logger');

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', label: 'Claude', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'gemini', label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'mistral', label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'grok', label: 'Grok', baseUrl: 'https://api.x.ai/v1' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
  { id: 'custom', label: 'OpenAI Compatible', baseUrl: '' }
];

function mapSetting(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    base_url: row.base_url,
    model: row.model,
    system_prompt: row.system_prompt,
    temperature: row.temperature,
    max_tokens: row.max_tokens,
    is_default: row.is_default,
    hasKey: !!row.api_key_encrypted,
    keyMasked: maskSecret(row.api_key_encrypted ? decrypt(row.api_key_encrypted) : ''),
    created_at: row.created_at
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.all('SELECT * FROM ai_settings WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]);
    const knowledgeBases = db.all('SELECT * FROM ai_knowledge_bases ORDER BY id DESC');
    res.render('aiSettings/index', {
      title: 'AI Providers',
      pageTitle: 'AI Providers',
      pageSubtitle: 'Per-user AI configuration, models and knowledge bases',
      settings: rows.map(mapSetting),
      providers: PROVIDERS,
      knowledgeBases,
      rows: rows.map(mapSetting)
    });
  } catch (err) {
    logger.error('AI settings error:', err);
    res.render('aiSettings/index', { title: 'AI Providers', pageTitle: 'AI Providers', settings: [], providers: PROVIDERS, knowledgeBases: [], rows: [] });
  }
});

router.post('/create', handleValidationErrors, (req, res) => {
  try {
    const provider = String(req.body.provider || 'openai');
    const name = String(req.body.name || '').trim() || provider;
    const apiKey = String(req.body.api_key || '').trim();
    const isDefault = req.body.is_default === 'on' ? 1 : 0;

    if (isDefault) {
      db.run('UPDATE ai_settings SET is_default = 0 WHERE user_id = ?', [req.session.user.id]);
    }

    db.run(
      `INSERT INTO ai_settings
       (user_id, provider, name, base_url, api_key_encrypted, model, system_prompt, temperature, max_tokens, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        req.session.user.id,
        provider,
        name,
        String(req.body.base_url || '').trim(),
        apiKey ? encrypt(apiKey) : null,
        String(req.body.model || '').trim(),
        String(req.body.system_prompt || '').trim(),
        Number(req.body.temperature) || 0.7,
        Number(req.body.max_tokens) || 2048,
        isDefault
      ]
    );

    req.flash('success', 'AI provider configuration saved.');
    res.redirect('/ai-settings');
  } catch (err) {
    logger.error('Create AI setting error:', err);
    req.flash('error', `Failed to save AI provider: ${err.message}`);
    res.redirect('/ai-settings');
  }
});

router.get('/:id/edit', idParam, handleValidationErrors, (req, res) => {
  try {
    const row = db.get('SELECT * FROM ai_settings WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (!row) {
      req.flash('error', 'Configuration not found.');
      return res.redirect('/ai-settings');
    }
    res.render('aiSettings/edit', {
      title: 'Edit AI provider',
      pageTitle: 'Edit AI provider',
      providers: PROVIDERS,
      values: mapSetting(row)
    });
  } catch (err) {
    logger.error('Edit AI setting error:', err);
    req.flash('error', 'Failed to load configuration.');
    res.redirect('/ai-settings');
  }
});

router.post('/:id/edit', idParam, handleValidationErrors, (req, res) => {
  try {
    const row = db.get('SELECT * FROM ai_settings WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (!row) {
      req.flash('error', 'Configuration not found.');
      return res.redirect('/ai-settings');
    }

    const isDefault = req.body.is_default === 'on' ? 1 : 0;
    if (isDefault) {
      db.run('UPDATE ai_settings SET is_default = 0 WHERE user_id = ?', [req.session.user.id]);
    }

    const apiKey = String(req.body.api_key || '').trim();
    const encryptedKey = apiKey ? encrypt(apiKey) : row.api_key_encrypted;

    db.run(
      `UPDATE ai_settings SET provider = ?, name = ?, base_url = ?, api_key_encrypted = ?, model = ?,
       system_prompt = ?, temperature = ?, max_tokens = ?, is_default = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        req.body.provider || row.provider,
        String(req.body.name || row.name).trim(),
        String(req.body.base_url || '').trim(),
        encryptedKey,
        String(req.body.model || '').trim(),
        String(req.body.system_prompt || '').trim(),
        Number(req.body.temperature) || 0.7,
        Number(req.body.max_tokens) || 2048,
        isDefault,
        row.id
      ]
    );

    req.flash('success', 'AI provider updated.');
    res.redirect('/ai-settings');
  } catch (err) {
    logger.error('Update AI setting error:', err);
    req.flash('error', `Failed to update AI provider: ${err.message}`);
    res.redirect(`/ai-settings/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    db.run('DELETE FROM ai_settings WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.flash('success', 'AI provider configuration deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete AI provider.');
  }
  res.redirect('/ai-settings');
});

module.exports = router;
module.exports.PROVIDERS = PROVIDERS;
