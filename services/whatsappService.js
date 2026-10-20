const pool = require('../config/database');
const logger = require('../utils/logger');

class WhatsAppService {
  async listInstances() {
    try {
      const result = await pool.query('SELECT * FROM whatsapp_instances ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('WhatsApp list error:', err.message);
      return [];
    }
  }
}

module.exports = new WhatsAppService();
