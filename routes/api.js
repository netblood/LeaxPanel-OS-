const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const serviceCount = await pool.query('SELECT COUNT(*) FROM services');
    res.json({
      users: parseInt(userCount.rows[0].count),
      services: parseInt(serviceCount.rows[0].count),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('API stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    logger.error('API users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    logger.error('API services error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

module.exports = router;
