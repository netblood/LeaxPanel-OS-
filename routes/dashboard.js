const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const serviceCount = await pool.query('SELECT COUNT(*) FROM services');
    const activeServices = await pool.query("SELECT COUNT(*) FROM services WHERE status = 'active'");
    const recentUsers = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    const recentServices = await pool.query('SELECT * FROM services ORDER BY created_at DESC LIMIT 5');

    res.render('dashboard/index', {
      title: 'Dashboard - LEAXOS',
      stats: {
        users: parseInt(userCount.rows[0].count),
        services: parseInt(serviceCount.rows[0].count),
        active: parseInt(activeServices.rows[0].count)
      },
      recentUsers: recentUsers.rows,
      recentServices: recentServices.rows
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.render('dashboard/index', {
      title: 'Dashboard - LEAXOS',
      stats: { users: 0, services: 0, active: 0 },
      recentUsers: [],
      recentServices: []
    });
  }
});

module.exports = router;
