const pool = require('../config/database');
const logger = require('../utils/logger');

class CommunicationService {
  async listChannels() {
    try {
      const result = await pool.query('SELECT * FROM communication_channels ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Communication list error:', err.message);
      return [];
    }
  }
}

module.exports = new CommunicationService();
