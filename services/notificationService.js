const logger = require('../utils/logger');

class NotificationService {
  async send(userId, type, message, data = {}) {
    logger.info(`Notification to user ${userId}: ${type} - ${message}`);
    // Placeholder for notification delivery (Socket.IO, email, etc.)
    return { success: true, id: Date.now() };
  }

  async broadcast(type, message, data = {}) {
    logger.info(`Broadcast notification: ${type} - ${message}`);
    return { success: true };
  }
}

module.exports = new NotificationService();
