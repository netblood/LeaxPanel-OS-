const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bots ORDER BY created_at DESC');
    res.render('bots/index', { title: 'Bots - LEAXOS', bots: result.rows });
  } catch (err) {
    logger.error('Bots list error:', err);
    res.render('bots/index', { title: 'Bots - LEAXOS', bots: [] });
  }
});

module.exports = router;
