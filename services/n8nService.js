const pool = require('../config/database');
const logger = require('../utils/logger');

class N8NService {
  async listWorkflows() {
    try {
      const result = await pool.query('SELECT * FROM n8n_workflows ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('N8N list error:', err.message);
      return [];
    }
  }
}

module.exports = new N8NService();
