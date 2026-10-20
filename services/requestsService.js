const pool = require('../config/database');
const logger = require('../utils/logger');

class RequestsService {
  async listRequests() {
    try {
      const result = await pool.query('SELECT * FROM support_requests ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Requests list error:', err.message);
      return [];
    }
  }
}

module.exports = new RequestsService();
