// Audit middleware - records every authenticated request into audit_logs
// and mirrors important activity to the Discord webhook.
const db = require('../config/db');
const logger = require('../utils/logger');
const discordService = require('../services/discordService');

const SKIP_PATHS = ['/login', '/register', '/health', '/api/auth', '/css', '/js', '/favicon'];

function shouldSkip(req) {
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) return true;
  if (req.path.startsWith('/api/auth')) return true;
  if (req.path.startsWith('/socket.io')) return true;
  if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images')) return true;
  return false;
}

function auditMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const user = req.session && req.session.user;

    if (!shouldSkip(req) && user) {
      const resource = req.path.split('/').filter(Boolean)[0] || 'root';
      const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;

      try {
        db.run(
          `INSERT INTO audit_logs
             (user_id, action, resource, resource_id, details, ip_address, user_agent, method, path, status_code, duration_ms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            user.id || null,
            req.method,
            resource,
            null,
            JSON.stringify({ query: req.query || {} }),
            ip,
            req.get('User-Agent') || null,
            req.method,
            req.path,
            res.statusCode,
            duration
          ]
        );
      } catch (err) {
        logger.error('Audit write failed:', err.message);
      }

      // Mirror mutations and failures to Discord
      if (res.statusCode >= 400 || req.method !== 'GET') {
        discordService.logEvent('API Request', {
          user: user.email,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip
        }, res.statusCode >= 400 ? 'warning' : 'info').catch(() => {});
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

module.exports = { auditMiddleware };
