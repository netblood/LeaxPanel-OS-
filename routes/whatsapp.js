const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whatsapp_instances ORDER BY created_at DESC');
    res.render('whatsapp/index', { title: 'WhatsApp - LEAXOS', instances: result.rows });
  } catch (err) {
    logger.error('WhatsApp list error:', err);
    res.render('whatsapp/index', { title: 'WhatsApp - LEAXOS', instances: [] });
  }
});

module.exports = router;
