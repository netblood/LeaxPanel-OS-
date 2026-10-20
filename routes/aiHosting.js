const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_hosting_instances ORDER BY created_at DESC');
    res.render('ai-hosting/index', { title: 'AI Hosting - LEAXOS', instances: result.rows });
  } catch (err) {
    logger.error('AI Hosting list error:', err);
    res.render('ai-hosting/index', { title: 'AI Hosting - LEAXOS', instances: [] });
  }
});

module.exports = router;
