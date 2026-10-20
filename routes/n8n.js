const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM n8n_workflows ORDER BY created_at DESC');
    res.render('n8n/index', { title: 'N8N - LEAXOS', workflows: result.rows });
  } catch (err) {
    logger.error('N8N list error:', err);
    res.render('n8n/index', { title: 'N8N - LEAXOS', workflows: [] });
  }
});

module.exports = router;
