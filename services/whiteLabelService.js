const pool = require('../config/database');
const logger = require('../utils/logger');

class WhiteLabelService {
  async listSettings() {
    try {
      const result = await pool.query('SELECT * FROM white_label_settings ORDER BY key ASC');
      return result.rows;
    } catch (err) {
      logger.error('White label settings error:', err.message);
      return [];
    }
  }
}

module.exports = new WhiteLabelService();
