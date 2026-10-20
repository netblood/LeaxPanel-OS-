const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM files ORDER BY created_at DESC LIMIT 50');
    res.render('file-manager/index', { title: 'File Manager - LEAXOS', files: result.rows });
  } catch (err) {
    logger.error('File manager list error:', err);
    res.render('file-manager/index', { title: 'File Manager - LEAXOS', files: [] });
  }
});

module.exports = router;
