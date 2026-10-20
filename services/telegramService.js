const pool = require('../config/database');
const logger = require('../utils/logger');

class TelegramService {
  async listBots() {
    try {
      const result = await pool.query('SELECT * FROM telegram_bots ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Telegram list error:', err.message);
      return [];
    }
  }
}

module.exports = new TelegramService();
