const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { handleValidationErrors, userSchema, idParam } = require('../middleware/validation');
const { ROLES } = require('../middleware/validation');
const rbac = require('../middleware/rbac');
const logger = require('../utils/logger');

const EDITABLE_COLUMNS = ['name', 'email', 'role', 'is_active'];

router.get('/', (req, res) => {
  try {
    const users = db.all(
      'SELECT id, name, email, role, is_active, email_verified, two_factor_enabled, created_at FROM users ORDER BY created_at DESC'
    );
    res.render('users/index', {
      title: 'Users',
      pageTitle: 'Users',
      pageSubtitle: 'Manage panel accounts, roles and access',
      users,
      rows: users,
      roles: ROLES,
      columns: [
        { key: 'name', label: 'User', primary: true },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', badge: true },
        { key: 'is_active', label: 'Status', status: true, map: v => (v ? 'active' : 'suspended') },
        { key: 'created_at', label: 'Created', date: true }
      ]
    });
  } catch (err) {
    logger.error('Users list error:', err);
    res.render('users/index', { title: 'Users', pageTitle: 'Users', users: [], rows: [], roles: ROLES, columns: [] });
  }
});

router.get('/create', (req, res) => {
  res.render('users/create', {
    title: 'Create user',
    pageTitle: 'Create user',
    roles: ROLES
  });
});

router.post('/create', userSchema, handleValidationErrors, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (db.get('SELECT id FROM users WHERE lower(email) = ?', [email])) {
      req.flash('error', 'A user with that email already exists.');
      return res.redirect('/users/create');
    }
    const password = req.body.password || 'Leaxos2024!';
    const hash = await bcrypt.hash(password, 12);
    db.run(
      "INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, datetime('now'))",
      [String(req.body.name || '').trim(), email, hash, req.body.role || 'user']
    );
    req.flash('success', 'User created successfully.');
    res.redirect('/users');
  } catch (err) {
    logger.error('Create user error:', err);
    req.flash('error', `Failed to create user: ${err.message}`);
    res.redirect('/users/create');
  }
});

router.get('/:id/edit', idParam, handleValidationErrors, (req, res) => {
  try {
    const row = db.get(
      'SELECT id, name, email, role, is_active, two_factor_enabled, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!row) {
      req.flash('error', 'User not found.');
      return res.redirect('/users');
    }
    res.render('users/edit', { title: 'Edit user', pageTitle: 'Edit user', values: row, item: row, roles: ROLES });
  } catch (err) {
    logger.error('Edit user error:', err);
    req.flash('error', 'Failed to load user.');
    res.redirect('/users');
  }
});

router.post('/:id/edit', idParam, userSchema, handleValidationErrors, async (req, res) => {
  try {
    const row = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!row) {
      req.flash('error', 'User not found.');
      return res.redirect('/users');
    }

    const name = String(req.body.name || row.name).trim();
    const email = String(req.body.email || row.email).trim().toLowerCase();
    const role = req.body.role || row.role;
    const isActive = req.body.is_active === 'on' || req.body.is_active === 'true' ? 1 : 0;

    const duplicate = db.get('SELECT id FROM users WHERE lower(email) = ? AND id != ?', [email, row.id]);
    if (duplicate) {
      req.flash('error', 'Another user already uses that email.');
      return res.redirect(`/users/${row.id}/edit`);
    }

    db.run(
      'UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [name, email, role, isActive, row.id]
    );

    if (req.body.password) {
      const hash = await bcrypt.hash(req.body.password, 12);
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.id]);
    }

    req.flash('success', 'User updated successfully.');
    res.redirect('/users');
  } catch (err) {
    logger.error('Update user error:', err);
    req.flash('error', `Failed to update user: ${err.message}`);
    res.redirect(`/users/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.session.user.id)) {
      req.flash('error', 'You cannot delete your own account.');
      return res.redirect('/users');
    }
    const row = db.get('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (row && row.role === 'owner') {
      const owners = db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
      if (owners && owners.count <= 1) {
        req.flash('error', 'The last owner account cannot be deleted.');
        return res.redirect('/users');
      }
    }
    db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    req.flash('success', 'User deleted successfully.');
    res.redirect('/users');
  } catch (err) {
    logger.error('Delete user error:', err);
    req.flash('error', `Failed to delete user: ${err.message}`);
    res.redirect('/users');
  }
});

router.post('/:id/toggle', idParam, handleValidationErrors, (req, res) => {
  try {
    const row = db.get('SELECT is_active FROM users WHERE id = ?', [req.params.id]);
    if (!row) {
      req.flash('error', 'User not found.');
      return res.redirect('/users');
    }
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [row.is_active ? 0 : 1, row.id]);
    req.flash('success', 'User status updated.');
    res.redirect('/users');
  } catch (err) {
    logger.error('Toggle user error:', err);
    req.flash('error', 'Failed to update user status.');
    res.redirect('/users');
  }
});

router.get('/roles', (req, res) => {
  res.render('users/roles', {
    title: 'Roles & permissions',
    pageTitle: 'Roles & permissions',
    roles: rbac.ROLES,
    permissions: rbac.PERMISSIONS,
    rolePermissions: rbac.ROLE_PERMISSIONS
  });
});

module.exports = router;
module.exports.EDITABLE_COLUMNS = EDITABLE_COLUMNS;
