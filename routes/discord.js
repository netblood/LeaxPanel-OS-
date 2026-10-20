const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM discord_bots ORDER BY created_at DESC');
    res.render('discord/index', { title: 'Discord - LEAXOS', bots: result.rows });
  } catch (err) {
    logger.error('Discord list error:', err);
    res.render('discord/index', { title: 'Discord - LEAXOS', bots: [] });
  }
});

module.exports = router;
