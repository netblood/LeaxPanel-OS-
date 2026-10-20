const pool = require('../config/database');
const logger = require('../utils/logger');

class AuditService {
  async log(action, userId, details = {}, ip = null, userAgent = null) {
    try {
      await pool.query(
        'INSERT INTO audit_logs (action, user_id, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [action, userId, JSON.stringify(details), ip, userAgent]
      );
    } catch (err) {
      logger.error('Audit log error:', err.message);
    }
  }

  async getLogs(limit = 100) {
    try {
      const result = await pool.query(
        'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (err) {
      logger.error('Audit logs fetch error:', err.message);
      return [];
    }
  }
}

module.exports = new AuditService();
