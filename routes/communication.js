const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM communication_channels ORDER BY created_at DESC');
    res.render('communication/index', { title: 'Communication - LEAXOS', channels: result.rows });
  } catch (err) {
    logger.error('Communication list error:', err);
    res.render('communication/index', { title: 'Communication - LEAXOS', channels: [] });
  }
});

module.exports = router;
