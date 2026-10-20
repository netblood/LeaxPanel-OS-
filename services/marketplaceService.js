const pool = require('../config/database');
const logger = require('../utils/logger');

class MarketplaceService {
  async listItems() {
    try {
      const result = await pool.query('SELECT * FROM marketplace_items ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Marketplace list error:', err.message);
      return [];
    }
  }
}

module.exports = new MarketplaceService();
