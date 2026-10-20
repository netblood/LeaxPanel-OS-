const nodeCron = require('node-cron');
const logger = require('../utils/logger');

class BackupService {
  constructor() {
    this.tasks = [];
  }

  start() {
    logger.info('Backup service initialized');
  }

  schedule(cronExpression, callback) {
    const task = nodeCron.schedule(cronExpression, callback);
    this.tasks.push(task);
    return task;
  }

  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('Backup service stopped');
  }
}

module.exports = new BackupService();
