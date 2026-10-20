const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_accounts ORDER BY created_at DESC');
    res.render('email/index', { title: 'Email - LEAXOS', accounts: result.rows });
  } catch (err) {
    logger.error('Email list error:', err);
    res.render('email/index', { title: 'Email - LEAXOS', accounts: [] });
  }
});

module.exports = router;
