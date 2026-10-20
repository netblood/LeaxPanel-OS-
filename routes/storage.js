const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM storage_buckets ORDER BY created_at DESC');
    res.render('storage/index', { title: 'Storage - LEAXOS', buckets: result.rows });
  } catch (err) {
    logger.error('Storage list error:', err);
    res.render('storage/index', { title: 'Storage - LEAXOS', buckets: [] });
  }
});

module.exports = router;
