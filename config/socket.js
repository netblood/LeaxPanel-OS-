const jwt = require('jsonwebtoken');
const db = require('./db');
const logger = require('../utils/logger');
const terminalService = require('../services/terminalService');

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(); // Allow unauthenticated connections for public rooms
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'leaxos-secret-change-me');
      socket.userId = decoded.userId;
      socket.user = decoded;
      socket.join(`user:${decoded.userId}`);
      next();
    } catch (err) {
      return next(); // Allow connection but without auth
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', (room) => {
      if (room) socket.join(room);
    });

    socket.on('leave-room', (room) => {
      if (room) socket.leave(room);
    });

    // Terminal events - attach to terminal service
    socket.on('terminal:join', (data) => {
      try {
        const { sessionId } = data;
        if (!sessionId || !socket.userId) return;
        
        // Attach socket to terminal session
        const attached = terminalService.attachSocket(sessionId, socket);
        if (attached) {
          socket.join(`terminal:${sessionId}`);
        }
      } catch (err) {
        logger.error('Terminal join error:', err);
      }
    });

    socket.on('disconnect', () => {
      // Cleanup handled by terminal service
    });
  });
}

module.exports = { initSocket };
