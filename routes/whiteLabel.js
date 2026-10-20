const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM white_label_settings ORDER BY key ASC');
    res.render('white-label/index', { title: 'White Label - LEAXOS', settings: result.rows });
  } catch (err) {
    logger.error('White label list error:', err);
    res.render('white-label/index', { title: 'White Label - LEAXOS', settings: [] });
  }
});

module.exports = router;
