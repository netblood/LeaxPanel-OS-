const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM marketplace_items ORDER BY created_at DESC');
    res.render('marketplace/index', { title: 'Marketplace - LEAXOS', items: result.rows });
  } catch (err) {
    logger.error('Marketplace list error:', err);
    res.render('marketplace/index', { title: 'Marketplace - LEAXOS', items: [] });
  }
});

module.exports = router;
