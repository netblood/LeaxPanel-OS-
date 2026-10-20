const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const logger = require('../utils/logger');
const { handleValidationErrors, serviceSchema } = require('../middleware/validation');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
    res.render('services/index', {
      title: 'Services - LEAXOS',
      services: result.rows
    });
  } catch (err) {
    logger.error('Services list error:', err);
    res.render('services/index', { title: 'Services - LEAXOS', services: [] });
  }
});

router.get('/create', (req, res) => {
  res.render('services/create', { title: 'Create Service - LEAXOS' });
});

router.post('/create', serviceSchema, handleValidationErrors, async (req, res) => {
  try {
    const { name, type, status = 'active', config } = req.body;
    await pool.query(
      'INSERT INTO services (name, type, status, config, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [name, type, status, config || '{}']
    );
    req.flash('success', 'Service created successfully');
    res.redirect('/services');
  } catch (err) {
    logger.error('Create service error:', err);
    req.flash('error', 'Failed to create service');
    res.redirect('/services/create');
  }
});

router.get('/:id/edit', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      req.flash('error', 'Service not found');
      return res.redirect('/services');
    }
    res.render('services/edit', {
      title: 'Edit Service - LEAXOS',
      service: result.rows[0]
    });
  } catch (err) {
    logger.error('Edit service error:', err);
    req.flash('error', 'Failed to load service');
    res.redirect('/services');
  }
});

router.post('/:id/edit', serviceSchema, handleValidationErrors, async (req, res) => {
  try {
    const { name, type, status, config } = req.body;
    await pool.query('UPDATE services SET name = $1, type = $2, status = $3, config = $4 WHERE id = $5', [name, type, status, config || '{}', req.params.id]);
    req.flash('success', 'Service updated successfully');
    res.redirect('/services');
  } catch (err) {
    logger.error('Update service error:', err);
    req.flash('error', 'Failed to update service');
    res.redirect('/services');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    req.flash('success', 'Service deleted successfully');
    res.redirect('/services');
  } catch (err) {
    logger.error('Delete service error:', err);
    req.flash('error', 'Failed to delete service');
    res.redirect('/services');
  }
});

module.exports = router;
