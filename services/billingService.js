const pool = require('../config/database');
const logger = require('../utils/logger');

class BillingService {
  async listInvoices(limit = 50) {
    try {
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT $1', [limit]);
      return result.rows;
    } catch (err) {
      logger.error('Billing invoices error:', err.message);
      return [];
    }
  }
}

module.exports = new BillingService();
