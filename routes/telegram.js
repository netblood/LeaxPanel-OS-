const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM telegram_bots ORDER BY created_at DESC');
    res.render('telegram/index', { title: 'Telegram - LEAXOS', bots: result.rows });
  } catch (err) {
    logger.error('Telegram list error:', err);
    res.render('telegram/index', { title: 'Telegram - LEAXOS', bots: [] });
  }
});

module.exports = router;
