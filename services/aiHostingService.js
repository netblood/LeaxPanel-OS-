const pool = require('../config/database');
const logger = require('../utils/logger');

class AIHostingService {
  async listInstances() {
    try {
      const result = await pool.query('SELECT * FROM ai_hosting_instances ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('AI Hosting list error:', err.message);
      return [];
    }
  }
}

module.exports = new AIHostingService();
