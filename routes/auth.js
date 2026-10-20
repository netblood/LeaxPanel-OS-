const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qr-image');
const pool = require('../config/database');
const { requireGuest, requireAuth } = require('../middleware/auth');
const { handleValidationErrors, registerSchema, loginSchema } = require('../middleware/validation');
const logger = require('../utils/logger');

router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { title: 'Login - LEAXOS' });
});

router.post('/login', requireGuest, loginSchema, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    if (user.totp_secret) {
      req.session.pending2fa = { userId: user.id };
      return res.redirect('/2fa/verify');
    }
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    req.flash('success', 'Welcome back!');
    return res.redirect('/dashboard');
  } catch (err) {
    logger.error('Login error:', err);
    req.flash('error', 'Login failed');
    res.redirect('/login');
  }
});

router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { title: 'Register - LEAXOS' });
});

router.post('/register', requireGuest, registerSchema, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      req.flash('error', 'Email already registered');
      return res.redirect('/register');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, role',
      [name, email, passwordHash, role]
    );
    const user = result.rows[0];
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    req.flash('success', 'Account created successfully');
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('Register error:', err);
    req.flash('error', 'Registration failed');
    res.redirect('/register');
  }
});

router.get('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('leaxos.sid');
    res.redirect('/login');
  });
});

router.get('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (user.totp_secret) {
      return res.redirect('/dashboard');
    }
    const secret = speakeasy.generateSecret({ name: `LEAXOS (${req.session.user.email})` });
    await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, userId]);
    const qrUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `LEAXOS:${req.session.user.email}`,
      issuer: 'LEAXOS',
      encoding: 'base32'
    });
    const qrImage = QRCode.image(qrUrl, { type: 'png' });
    res.set('Content-Type', 'image/png');
    qrImage.pipe(res);
  } catch (err) {
    logger.error('2FA setup error:', err);
    req.flash('error', '2FA setup failed');
    res.redirect('/dashboard');
  }
});

router.get('/2fa/verify', requireGuest, (req, res) => {
  if (!req.session.pending2fa) return res.redirect('/login');
  res.render('auth/2fa-verify', { title: '2FA Verification - LEAXOS' });
});

router.post('/2fa/verify', requireGuest, async (req, res) => {
  try {
    const { token } = req.body;
    const { userId } = req.session.pending2fa || {};
    if (!userId) return res.redirect('/login');
    const result = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user.totp_secret) {
      req.flash('error', '2FA not configured');
      return res.redirect('/login');
    }
    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token
    });
    if (!verified) {
      req.flash('error', 'Invalid 2FA code');
      return res.redirect('/2fa/verify');
    }
    delete req.session.pending2fa;
    const userResult = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [userId]);
    req.session.user = userResult.rows[0];
    req.flash('success', 'Welcome back!');
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('2FA verify error:', err);
    req.flash('error', '2FA verification failed');
    res.redirect('/2fa/verify');
  }
});

module.exports = router;
