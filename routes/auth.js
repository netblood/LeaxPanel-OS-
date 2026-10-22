const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qr-image');
const db = require('../config/db');
const { requireGuest, requireAuth } = require('../middleware/auth');
const { handleValidationErrors, registerSchema, loginSchema } = require('../middleware/validation');
const { authLimiter } = require('../config/security');
const panelSettings = require('../services/panelSettingsService');
const discordService = require('../services/discordService');
const logger = require('../utils/logger');

/* ------------------------------------------------------------------ login */
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Sign in',
    layout: false,
    user: null,
    registrationEnabled: panelSettings.isRegistrationEnabled()
  });
});

router.post('/login', requireGuest, authLimiter, loginSchema, handleValidationErrors, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const row = db.get('SELECT * FROM users WHERE lower(email) = ?', [email]);

    if (!row || !(await bcrypt.compare(req.body.password || '', row.password_hash))) {
      req.flash('error', 'Invalid email or password.');
      discordService.logAuthEvent({ email }, 'failed_login', req.ip).catch(() => {});
      return res.redirect('/login');
    }

    if (!row.is_active) {
      req.flash('error', 'This account has been deactivated. Contact your administrator.');
      return res.redirect('/login');
    }

    if (row.totp_secret) {
      req.session.pending2fa = { userId: row.id };
      return res.redirect('/2fa/verify');
    }

    req.session.user = { id: row.id, email: row.email, name: row.name, role: row.role };
    req.flash('success', `Welcome back, ${row.name}.`);
    discordService.logAuthEvent(row, 'login', req.ip).catch(() => {});

    // express-session writes the session and sets the cookie on the response
    // automatically. Calling req.session.save() here would flush the headers
    // before the cookie could be attached, so the session would be lost.
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('Login error:', err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

/* --------------------------------------------------------------- register */
router.get('/register', requireGuest, (req, res) => {
  if (!panelSettings.isRegistrationEnabled()) {
    req.flash('error', 'Public registration is disabled on this panel.');
    return res.redirect('/login');
  }
  res.render('auth/register', {
    title: 'Create account',
    layout: false,
    user: null,
    registrationEnabled: true
  });
});

router.post('/register', requireGuest, authLimiter, registerSchema, handleValidationErrors, async (req, res) => {
  if (!panelSettings.isRegistrationEnabled()) {
    req.flash('error', 'Public registration is disabled on this panel.');
    return res.redirect('/login');
  }
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    const existing = db.get('SELECT id FROM users WHERE lower(email) = ?', [email]);
    if (existing) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/register');
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const result = db.run(
      "INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, 'user', 1, datetime('now'))",
      [name, email, passwordHash]
    );

    const user = db.get('SELECT id, name, email, role FROM users WHERE id = ?', [result.lastInsertRowid]);
    req.session.user = user;
    req.flash('success', 'Account created successfully.');
    discordService.logAuthEvent(user, 'register', req.ip).catch(() => {});
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('Register error:', err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

/* ----------------------------------------------------------------- logout */
router.post('/logout', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  req.session.destroy(() => {
    res.clearCookie('leaxos.sid');
    discordService.logAuthEvent(user, 'logout', req.ip).catch(() => {});
    res.redirect('/login');
  });
});

router.get('/logout', (req, res) => res.redirect('/dashboard'));

/* -------------------------------------------------------------------- 2FA */
router.get('/2fa/setup', requireAuth, (req, res) => {
  try {
    const row = db.get('SELECT totp_secret FROM users WHERE id = ?', [req.session.user.id]);
    if (row && row.totp_secret) return res.redirect('/profile');

    const secret = speakeasy.generateSecret({ name: `LeaxPanel (${req.session.user.email})` });
    db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret.base32, req.session.user.id]);

    const otpUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `LeaxPanel:${req.session.user.email}`,
      issuer: 'LeaxPanel',
      encoding: 'base32'
    });

    const qrImage = QRCode.image(otpUrl, { type: 'png', margin: 1, width: 220 });
    qrImage.pipe(res);
  } catch (err) {
    logger.error('2FA setup error:', err);
    req.flash('error', 'Could not generate the 2FA QR code.');
    res.redirect('/profile');
  }
});

router.get('/2fa/verify', requireGuest, (req, res) => {
  if (!req.session.pending2fa) return res.redirect('/login');
  res.render('auth/2fa-verify', { title: 'Two-factor verification', layout: false, user: null });
});

router.post('/2fa/verify', requireGuest, authLimiter, async (req, res) => {
  try {
    const { userId } = req.session.pending2fa || {};
    if (!userId) return res.redirect('/login');

    const row = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row || !row.totp_secret) {
      req.flash('error', 'Two-factor authentication is not configured for this account.');
      return res.redirect('/login');
    }

    const token = String(req.body.token || '').replace(/\s+/g, '');
    const verified = speakeasy.totp.verify({ secret: row.totp_secret, encoding: 'base32', token });

    if (!verified) {
      req.flash('error', 'Invalid verification code.');
      return res.redirect('/2fa/verify');
    }

    delete req.session.pending2fa;
    req.session.user = { id: row.id, email: row.email, name: row.name, role: row.role };
    db.run('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', [row.id]);
    req.flash('success', 'Welcome back.');
    discordService.logAuthEvent(row, '2fa_verify', req.ip).catch(() => {});
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('2FA verify error:', err);
    req.flash('error', 'Verification failed. Please try again.');
    res.redirect('/2fa/verify');
  }
});

module.exports = router;
