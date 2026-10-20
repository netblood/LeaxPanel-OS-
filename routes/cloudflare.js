const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cloudflare_zones ORDER BY created_at DESC');
    res.render('cloudflare/index', { title: 'Cloudflare - LEAXOS', zones: result.rows });
  } catch (err) {
    logger.error('Cloudflare list error:', err);
    res.render('cloudflare/index', { title: 'Cloudflare - LEAXOS', zones: [] });
  }
});

module.exports = router;
