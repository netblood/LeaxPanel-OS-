const db = require('../config/db');
const logger = require('../utils/logger');

function listEvents(limit = 50) {
  try {
    return db.all('SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?', [limit]);
  } catch (err) {
    logger.error('Security events error:', err.message);
    return [];
  }
}

function listIpLists(listType = 'blacklist') {
  try {
    return db.all('SELECT * FROM ip_lists WHERE list_type = ? ORDER BY created_at DESC', [listType]);
  } catch (err) {
    logger.error('IP list error:', err.message);
    return [];
  }
}

function addIp(ipAddress, listType = 'blacklist', note = '') {
  db.run(
    "INSERT OR IGNORE INTO ip_lists (ip_address, list_type, note, created_at) VALUES (?, ?, ?, datetime('now'))",
    [ipAddress, listType, note]
  );
  return db.get('SELECT * FROM ip_lists WHERE ip_address = ? AND list_type = ?', [ipAddress, listType]);
}

function removeIp(id) {
  db.run('DELETE FROM ip_lists WHERE id = ?', [id]);
}

function logEvent(eventType, severity = 'info', details = null, userId = null) {
  try {
    db.run(
      `INSERT INTO security_events (event_type, user_id, ip_address, user_agent, severity, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [eventType, userId, null, null, severity, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    logger.warn('Failed to log security event:', err.message);
  }
}

/**
 * Computes a 0-100 security score based on panel hardening signals.
 */
function computeSecurityScore() {
  let score = 100;
  const deductions = [];

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('change-me')) {
    score -= 20;
    deductions.push('SESSION_SECRET is not configured');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
    score -= 10;
    deductions.push('JWT_SECRET is not configured');
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.includes('change-me')) {
    score -= 10;
    deductions.push('ENCRYPTION_KEY is not configured');
  }
  if (process.env.NODE_ENV !== 'production') {
    score -= 10;
    deductions.push('NODE_ENV is not set to production');
  }

  try {
    const weak = db.get(
      "SELECT COUNT(*) AS count FROM users WHERE two_factor_enabled = 0 AND role IN ('owner','admin')"
    );
    if (weak && weak.count > 0) {
      score -= Math.min(20, weak.count * 10);
      deductions.push(`${weak.count} privileged account(s) without 2FA`);
    }
  } catch (err) { /* ignore */ }

  try {
    const inactive = db.get('SELECT COUNT(*) AS count FROM users WHERE is_active = 0');
    if (inactive && inactive.count > 0) {
      score -= 5;
      deductions.push(`${inactive.count} inactive account(s)`);
    }
  } catch (err) { /* ignore */ }

  return Math.max(0, Math.min(100, score));
}

function securitySummary() {
  const score = computeSecurityScore();
  const events = listEvents(10);
  const critical = events.filter(e => String(e.severity).toLowerCase() === 'critical').length;
  const warnings = events.filter(e => String(e.severity).toLowerCase() === 'warning').length;
  return { score, critical, warnings, events };
}

module.exports = {
  listEvents,
  listIpLists,
  addIp,
  removeIp,
  logEvent,
  computeSecurityScore,
  securitySummary
};
