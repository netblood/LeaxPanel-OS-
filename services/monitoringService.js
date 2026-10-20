const os = require('os');
const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.interval = null;
    this.metrics = [];
  }

  start(intervalMs = 60000) {
    this.collectMetrics();
    this.interval = setInterval(() => this.collectMetrics(), intervalMs);
    logger.info('Monitoring service started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info('Monitoring service stopped');
  }

  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      cpu: os.cpus().length,
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      uptime: process.uptime(),
      loadavg: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };
    this.metrics.push(metrics);
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    return metrics;
  }

  getMetrics() {
    return this.metrics;
  }

  getCurrentMetrics() {
    return this.collectMetrics();
  }
}

module.exports = new MonitoringService();
