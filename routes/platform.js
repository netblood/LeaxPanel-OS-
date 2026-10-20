const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM platform_settings ORDER BY key ASC');
    res.render('platform/index', { title: 'Platform - LEAXOS', settings: result.rows });
  } catch (err) {
    logger.error('Platform list error:', err);
    res.render('platform/index', { title: 'Platform - LEAXOS', settings: [] });
  }
});

module.exports = router;
