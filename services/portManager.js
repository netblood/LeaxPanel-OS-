// Smart Port Manager - port allocation, reservation, conflict detection.
// Users never see ports; only URLs. Ports are allocated automatically.
const db = require('../config/db');
const logger = require('../utils/logger');

const PORT_RANGE_START = parseInt(process.env.PORT_RANGE_START || '3001', 10);
const PORT_RANGE_END = parseInt(process.env.PORT_RANGE_END || '65535', 10);

class PortManager {
  /**
   * Check if a port is already allocated in the database.
   */
  isAllocated(port) {
    const row = db.get('SELECT id FROM service_ports WHERE port = ? AND released_at IS NULL', [port]);
    return !!row;
  }

  /**
   * Check if a port is actually in use on the system (listening).
   * Uses a quick TCP connection attempt.
   */
  async isSystemInUse(port) {
    const net = require('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        socket.destroy();
        resolve(false);
      }, 500);

      socket.on('connect', () => {
        if (!timedOut) {
          clearTimeout(timer);
          socket.destroy();
          resolve(true);
        }
      });
      socket.on('error', () => {
        if (!timedOut) {
          clearTimeout(timer);
          resolve(false);
        }
      });
      socket.on('close', () => {
        if (!timedOut) {
          clearTimeout(timer);
          resolve(false);
        }
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  /**
   * Find the next free port in the configured range.
   * Skips ports already allocated in DB and ports in use by the system.
   */
  async findFreePort(serviceType, serviceId, userId, preferredPort) {
    const start = preferredPort || PORT_RANGE_START;
    const end = Math.min(preferredPort ? start + 1000 : PORT_RANGE_END, start + 5000);

    for (let port = start; port <= end; port++) {
      if (this.isAllocated(port)) continue;
      if (await this.isSystemInUse(port)) continue;

      // Allocate it
      const result = db.run(
        `INSERT INTO service_ports (service_type, service_id, port, user_id) VALUES (?, ?, ?, ?)`,
        [serviceType, serviceId, port, userId]
      );
      logger.info(`[PortManager] Allocated port ${port} for ${serviceType}:${serviceId}`);
      return port;
    }

    throw new Error(`No free port available in range ${start}-${end}`);
  }

  /**
   * Release a port allocation for a service.
   */
  releasePort(serviceType, serviceId) {
    const result = db.run(
      `UPDATE service_ports SET released_at = datetime('now') WHERE service_type = ? AND service_id = ? AND released_at IS NULL`,
      [serviceType, serviceId]
    );
    if (result.changes > 0) {
      logger.info(`[PortManager] Released port(s) for ${serviceType}:${serviceId}`);
    }
    return result.changes;
  }

  /**
   * Get the allocated port for a service.
   */
  getPort(serviceType, serviceId) {
    const row = db.get(
      'SELECT port FROM service_ports WHERE service_type = ? AND service_id = ? AND released_at IS NULL',
      [serviceType, serviceId]
    );
    return row ? row.port : null;
  }

  /**
   * Get all port allocations.
   */
  getAll() {
    return db.all(`
      SELECT sp.*, u.email as user_email
      FROM service_ports sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.released_at IS NULL
      ORDER BY sp.port
    `);
  }

  /**
   * Check for port conflicts across all allocations.
   */
  checkConflicts() {
    const conflicts = db.all(`
      SELECT port, COUNT(*) as count
      FROM service_ports
      WHERE released_at IS NULL
      GROUP BY port
      HAVING count > 1
    `);
    return conflicts;
  }

  /**
   * Get port range configuration.
   */
  getRange() {
    return { start: PORT_RANGE_START, end: PORT_RANGE_END };
  }
}

module.exports = new PortManager();
