const pool = require('../config/database');
const logger = require('../utils/logger');

class BotsService {
  async listBots() {
    try {
      const result = await pool.query('SELECT * FROM bots ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Bots list error:', err.message);
      return [];
    }
  }
}

module.exports = new BotsService();
