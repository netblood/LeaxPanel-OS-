const Docker = require('dockerode');
const logger = require('../utils/logger');

class DockerService {
  constructor() {
    try {
      this.docker = new Docker();
    } catch (err) {
      logger.warn('Docker not available:', err.message);
      this.docker = null;
    }
  }

  async listContainers() {
    if (!this.docker) return [];
    try {
      return await this.docker.listContainers({ all: true });
    } catch (err) {
      logger.error('Docker list containers error:', err);
      return [];
    }
  }

  async getContainer(id) {
    if (!this.docker) return null;
    try {
      return this.docker.getContainer(id);
    } catch (err) {
      logger.error('Docker get container error:', err);
      return null;
    }
  }
}

module.exports = new DockerService();
