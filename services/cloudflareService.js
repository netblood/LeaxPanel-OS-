const axios = require('axios');
const logger = require('../utils/logger');

class CloudflareService {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  async listZones() {
    if (!this.apiToken) {
      logger.warn('Cloudflare API token not configured');
      return [];
    }
    try {
      const response = await axios.get(`${this.baseURL}/zones`, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      });
      return response.data.result || [];
    } catch (err) {
      logger.error('Cloudflare list zones error:', err.message);
      return [];
    }
  }
}

module.exports = new CloudflareService();
