const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
    res.render('domains/index', { title: 'Domains - LEAXOS', domains: result.rows });
  } catch (err) {
    logger.error('Domains list error:', err);
    res.render('domains/index', { title: 'Domains - LEAXOS', domains: [] });
  }
});

module.exports = router;
