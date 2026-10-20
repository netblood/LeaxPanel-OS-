const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_events ORDER BY created_at DESC LIMIT 50');
    res.render('security/index', { title: 'Security - LEAXOS', events: result.rows });
  } catch (err) {
    logger.error('Security list error:', err);
    res.render('security/index', { title: 'Security - LEAXOS', events: [] });
  }
});

module.exports = router;
