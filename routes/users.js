const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { handleValidationErrors, userSchema } = require('../middleware/validation');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.render('users/index', {
      title: 'Users - LEAXOS',
      users: result.rows
    });
  } catch (err) {
    logger.error('Users list error:', err);
    res.render('users/index', { title: 'Users - LEAXOS', users: [] });
  }
});

router.get('/create', (req, res) => {
  res.render('users/create', { title: 'Create User - LEAXOS' });
});

router.post('/create', userSchema, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const passwordHash = await bcrypt.hash(password || 'Leaxos2024!', 12);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [name, email, passwordHash, role]
    );
    req.flash('success', 'User created successfully');
    res.redirect('/users');
  } catch (err) {
    logger.error('Create user error:', err);
    req.flash('error', 'Failed to create user');
    res.redirect('/users/create');
  }
});

router.get('/:id/edit', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/users');
    }
    res.render('users/edit', {
      title: 'Edit User - LEAXOS',
      user: result.rows[0]
    });
  } catch (err) {
    logger.error('Edit user error:', err);
    req.flash('error', 'Failed to load user');
    res.redirect('/users');
  }
});

router.post('/:id/edit', userSchema, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    await pool.query('UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4', [name, email, role, req.params.id]);
    req.flash('success', 'User updated successfully');
    res.redirect('/users');
  } catch (err) {
    logger.error('Update user error:', err);
    req.flash('error', 'Failed to update user');
    res.redirect('/users');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    req.flash('success', 'User deleted successfully');
    res.redirect('/users');
  } catch (err) {
    logger.error('Delete user error:', err);
    req.flash('error', 'Failed to delete user');
    res.redirect('/users');
  }
});

module.exports = router;
