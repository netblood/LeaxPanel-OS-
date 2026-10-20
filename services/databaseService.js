const pool = require('../config/database');
const logger = require('../utils/logger');

class DatabaseService {
  async listDatabases() {
    try {
      const result = await pool.query('SELECT * FROM databases ORDER BY created_at DESC');
      return result.rows;
    } catch (err) {
      logger.error('Database list error:', err.message);
      return [];
    }
  }

  async createDatabase(name, type, config = {}) {
    try {
      const result = await pool.query(
        'INSERT INTO databases (name, type, config, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [name, type, JSON.stringify(config), 'active']
      );
      return result.rows[0];
    } catch (err) {
      logger.error('Database create error:', err.message);
      throw err;
    }
  }
}

module.exports = new DatabaseService();
