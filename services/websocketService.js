const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
    logger.info('WebSocket service initialized');
  }

  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  emit(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

module.exports = new WebSocketService();
