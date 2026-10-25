const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { handleValidationErrors } = require('../middleware/validation');
const panelSettings = require('../services/panelSettingsService');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  const row = db.get(
    'SELECT id, name, email, role, is_active, email_verified, two_factor_enabled, created_at FROM users WHERE id = ?',
    [req.session.user.id]
  ) || {};
  res.render('profile/index', {
    title: 'My profile',
    pageTitle: 'My profile',
    pageSubtitle: 'Manage your account, security and AI preferences',
    profile: row,
    values: row,
    aiSettings: db.all('SELECT id, provider, name, model, is_default FROM ai_settings WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]),
    panelSettings: panelSettings.all()
  });
});

router.post('/', handleValidationErrors, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    const duplicate = db.get('SELECT id FROM users WHERE lower(email) = ? AND id != ?', [email, req.session.user.id]);
    if (duplicate) {
      req.flash('error', 'That email is already used by another account.');
      return res.redirect('/profile');
    }

    db.run('UPDATE users SET name = ?, email = ?, updated_at = datetime(\'now\') WHERE id = ?', [name, email, req.session.user.id]);
    req.session.user.name = name;
    req.session.user.email = email;
    req.flash('success', 'Profile updated successfully.');
  } catch (err) {
    logger.error('Profile update error:', err);
    req.flash('error', `Failed to update profile: ${err.message}`);
  }
  res.redirect('/profile');
});

router.post('/password', handleValidationErrors, async (req, res) => {
  try {
    const row = db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
    if (!row) {
      req.flash('error', 'Account not found.');
      return res.redirect('/profile');
    }
    const current = String(req.body.current_password || '');
    const next = String(req.body.new_password || '');

    if (!(await bcrypt.compare(current, row.password_hash))) {
      req.flash('error', 'Your current password is incorrect.');
      return res.redirect('/profile');
    }
    if (next.length < 8) {
      req.flash('error', 'The new password must be at least 8 characters long.');
      return res.redirect('/profile');
    }

    const hash = await bcrypt.hash(next, 12);
    db.run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [hash, req.session.user.id]);
    req.flash('success', 'Password changed successfully.');
  } catch (err) {
    logger.error('Password change error:', err);
    req.flash('error', 'Failed to change password.');
  }
  res.redirect('/profile');
});

router.post('/2fa/disable', (req, res) => {
  try {
    db.run('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?', [req.session.user.id]);
    req.flash('success', 'Two-factor authentication disabled.');
  } catch (err) {
    req.flash('error', 'Failed to disable two-factor authentication.');
  }
  res.redirect('/profile');
});

module.exports = router;
