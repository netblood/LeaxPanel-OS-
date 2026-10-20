const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM databases ORDER BY created_at DESC');
    res.render('databases/index', { title: 'Databases - LEAXOS', databases: result.rows });
  } catch (err) {
    logger.error('Databases list error:', err);
    res.render('databases/index', { title: 'Databases - LEAXOS', databases: [] });
  }
});

module.exports = router;
