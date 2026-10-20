const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM support_requests ORDER BY created_at DESC');
    res.render('requests/index', { title: 'Requests - LEAXOS', requests: result.rows });
  } catch (err) {
    logger.error('Requests list error:', err);
    res.render('requests/index', { title: 'Requests - LEAXOS', requests: [] });
  }
});

module.exports = router;
