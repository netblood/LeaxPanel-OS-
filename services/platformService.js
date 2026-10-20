const pool = require('../config/database');
const logger = require('../utils/logger');

class PlatformService {
  async listSettings() {
    try {
      const result = await pool.query('SELECT * FROM platform_settings ORDER BY key ASC');
      return result.rows;
    } catch (err) {
      logger.error('Platform settings error:', err.message);
      return [];
    }
  }
}

module.exports = new PlatformService();
