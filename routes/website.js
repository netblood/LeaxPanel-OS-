const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM websites ORDER BY created_at DESC');
    res.render('website/index', { title: 'Websites - LEAXOS', websites: result.rows });
  } catch (err) {
    logger.error('Websites list error:', err);
    res.render('website/index', { title: 'Websites - LEAXOS', websites: [] });
  }
});

module.exports = router;
