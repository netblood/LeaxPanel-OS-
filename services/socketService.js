// Socket Service - Centralized Socket.IO instance
let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function getIo() {
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToRoom(room, event, data) {
  if (io) {
    io.to(room).emit(event, data);
  }
}

function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = {
  setIo,
  getIo,
  emitToUser,
  emitToRoom,
  broadcast
};