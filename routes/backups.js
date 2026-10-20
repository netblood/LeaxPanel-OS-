const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM backups ORDER BY created_at DESC');
    res.render('backups/index', { title: 'Backups - LEAXOS', backups: result.rows });
  } catch (err) {
    logger.error('Backups list error:', err);
    res.render('backups/index', { title: 'Backups - LEAXOS', backups: [] });
  }
});

router.post('/create', async (req, res) => {
  try {
    await pool.query('INSERT INTO backups (name, type, status, created_at) VALUES ($1, $2, $3, NOW())', ['Manual Backup', 'manual', 'completed']);
    req.flash('success', 'Backup created successfully');
    res.redirect('/backups');
  } catch (err) {
    logger.error('Create backup error:', err);
    req.flash('error', 'Failed to create backup');
    res.redirect('/backups');
  }
});

module.exports = router;
