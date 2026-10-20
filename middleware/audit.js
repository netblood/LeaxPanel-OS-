const pool = require('../config/database');

const SKIP_PATHS = ['/login', '/register', '/health', '/api/auth'];

function auditMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const shouldSkip = SKIP_PATHS.some(p => req.path.startsWith(p)) || req.path.startsWith('/api/auth');

    if (!shouldSkip && req.session && req.session.user) {
      pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent, method, path, status_code, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          req.session.user.id || null,
          req.method,
          req.path.split('/')[1] || 'root',
          null,
          req.ip || req.connection.remoteAddress || null,
          req.get('User-Agent') || null,
          req.method,
          req.path,
          res.statusCode,
          duration
        ]
      ).catch(() => {});
    }

    return originalSend.call(this, body);
  };

  next();
}

module.exports = { auditMiddleware };
