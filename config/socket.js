const jwt = require('jsonwebtoken');

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

    socket.on('disconnect', () => {
      // Cleanup handled automatically
    });
  });
}

module.exports = { initSocket };
