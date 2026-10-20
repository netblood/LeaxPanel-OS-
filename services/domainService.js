const pool = require('../config/database');
const logger = require('../utils/logger');

class DomainService {
  async listDomains() {
    try {
      const result = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Domain list error:', err.message);
      return [];
    }
  }
}

module.exports = new DomainService();
