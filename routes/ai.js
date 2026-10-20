const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_agents ORDER BY created_at DESC');
    res.render('ai/index', { title: 'AI Platform - LEAXOS', agents: result.rows });
  } catch (err) {
    logger.error('AI list error:', err);
    res.render('ai/index', { title: 'AI Platform - LEAXOS', agents: [] });
  }
});

router.get('/create', (req, res) => {
  res.render('ai/create', { title: 'Create AI Agent - LEAXOS' });
});

router.post('/create', async (req, res) => {
  try {
    const { name, type, model, config } = req.body;
    await pool.query(
      'INSERT INTO ai_agents (name, type, model, config, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [name, type, model, config || '{}']
    );
    req.flash('success', 'AI agent created successfully');
    res.redirect('/ai');
  } catch (err) {
    logger.error('Create AI agent error:', err);
    req.flash('error', 'Failed to create AI agent');
    res.redirect('/ai/create');
  }
});

module.exports = router;
