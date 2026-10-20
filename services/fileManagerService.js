const pool = require('../config/database');
const logger = require('../utils/logger');

class FileManagerService {
  async listFiles(limit = 50) {
    try {
      const result = await pool.query('SELECT * FROM files ORDER BY created_at DESC LIMIT $1', [limit]);
      return result.rows;
    } catch (err) {
      logger.error('File manager list error:', err.message);
      return [];
    }
  }
}

module.exports = new FileManagerService();
