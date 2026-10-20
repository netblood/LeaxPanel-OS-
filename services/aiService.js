const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.baseURL = process.env.AI_API_URL || 'http://localhost:11434';
  }

  async generate(prompt, model = 'llama2') {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model,
        prompt,
        stream: false
      });
      return response.data;
    } catch (err) {
      logger.error('AI generation error:', err.message);
      throw err;
    }
  }

  async listModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models || [];
    } catch (err) {
      logger.error('AI list models error:', err.message);
      return [];
    }
  }
}

module.exports = new AIService();
