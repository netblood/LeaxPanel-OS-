const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 50');
    res.render('billing/index', { title: 'Billing - LEAXOS', invoices: result.rows });
  } catch (err) {
    logger.error('Billing list error:', err);
    res.render('billing/index', { title: 'Billing - LEAXOS', invoices: [] });
  }
});

module.exports = router;
