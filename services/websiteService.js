const pool = require('../config/database');
const logger = require('../utils/logger');

class WebsiteService {
  async listWebsites() {
    try {
      const result = await pool.query('SELECT * FROM websites ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Websites list error:', err.message);
      return [];
    }
  }
}

module.exports = new WebsiteService();
