/**
 * Terminal Service - PTY process management with Socket.IO relay
 * Provides project-scoped, audited terminal sessions via xterm.js
 */
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const pty = require('node-pty');
const db = require('../config/db');
const logger = require('../utils/logger');

class TerminalService {
  constructor() {
    this.sessions = new Map(); // sessionId -> { process, socket, userId, sessionData }
  }

  /**
   * Create a new terminal session
   */
  async createSession(userId, sessionData) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const cols = sessionData.cols || 120;
    const rows = sessionData.rows || 30;
    const shell = sessionData.shell || 'bash';
    const cwd = sessionData.path || `/home/${userId}/workspace`;

    // Validate and resolve working directory
    const filesRoot = path.resolve(__dirname, '..', 'data', 'files');
    const resolvedCwd = path.resolve(filesRoot, cwd.replace(/^~/, ''));
    
    // Ensure path is within workspace
    if (!resolvedCwd.startsWith(filesRoot)) {
      throw new Error('Working directory must be within workspace');
    }

    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(resolvedCwd)) {
      fs.mkdirSync(resolvedCwd, { recursive: true });
    }

    // Spawn PTY process
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      HOME: resolvedCwd,
      USER: `user${userId}`,
      SHELL: this.getShellPath(shell),
      PATH: process.env.PATH
    };

    const ptyProcess = pty.spawn(this.getShellPath(shell), [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: resolvedCwd,
      env,
      encoding: 'utf8'
    });

    // Store session
    const session = {
      id: sessionId,
      userId,
      process: ptyProcess,
      cols,
      rows,
      cwd: resolvedCwd,
      shell,
      name: sessionData.name || 'Untitled Terminal',
      audited: sessionData.audited || 0,
      createdAt: Date.now(),
      socket: null
    };

    this.sessions.set(sessionId, session);

    // Set up PTY output handler
    ptyProcess.onData((data) => {
      this.handleOutput(sessionId, data);
    });

    ptyProcess.onExit((exitCode) => {
      this.handleExit(sessionId, exitCode);
    });

    // Persist to database
    try {
      await this.persistSession(sessionId, session);
    } catch (err) {
      logger.warn('Failed to persist terminal session:', err.message);
    }

    logger.info(`Terminal session created: ${sessionId} for user ${userId}`);
    return { sessionId, session };
  }

  /**
   * Attach socket to session for real-time relay
   */
  attachSocket(sessionId, socket) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.userId !== socket.userId) return false;

    session.socket = socket;

    // Send initial buffer/connection confirmation
    socket.emit('terminal:connected', { sessionId, cols: session.cols, rows: session.rows });

    // Handle input from socket
    socket.on('terminal:input', (data) => {
      this.handleInput(sessionId, data);
    });

    socket.on('terminal:resize', (data) => {
      this.handleResize(sessionId, data);
    });

    socket.on('terminal:close', () => {
      this.closeSession(sessionId);
    });

    socket.on('disconnect', () => {
      session.socket = null;
    });

    return true;
  }

  /**
   * Handle input from frontend
   */
  handleInput(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) return;

    try {
      session.process.write(data);
    } catch (err) {
      logger.error('Terminal input error:', err);
    }
  }

  /**
   * Handle output from PTY
   */
  handleOutput(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.socket) return;

    try {
      session.socket.emit('terminal:output', { sessionId, output: data });
    } catch (err) {
      logger.error('Terminal output error:', err);
    }
  }

  /**
   * Handle PTY resize
   */
  handleResize(sessionId, { cols, rows }) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) return;

    try {
      session.process.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      
      // Persist new dimensions
      db.run('UPDATE terminal_sessions SET cols = ?, rows = ?, updated_at = datetime(\'now\') WHERE id = ?', [cols, rows, sessionId]);
    } catch (err) {
      logger.error('Terminal resize error:', err);
    }
  }

  /**
   * Handle PTY exit
   */
  handleExit(sessionId, exitCode) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Notify frontend
    if (session.socket) {
      session.socket.emit('terminal:exit', { sessionId, exitCode });
      session.socket.emit('terminal:close', { sessionId });
    }

    // Update database
    try {
      db.run("UPDATE terminal_sessions SET status = 'closed', exit_code = ?, ended_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [exitCode, sessionId]);
    } catch (err) {
      logger.warn('Failed to update session on exit:', err.message);
    }

    // Clean up
    this.sessions.delete(sessionId);
    logger.info(`Terminal session exited: ${sessionId} (code: ${exitCode})`);
  }

  /**
   * Close session gracefully
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.process) {
      try {
        session.process.kill('SIGTERM');
      } catch (err) {
        logger.warn('Failed to kill PTY process:', err.message);
      }
    }

    this.handleExit(sessionId, 0);
    return true;
  }

  /**
   * Get session info
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId) {
    const userSessions = [];
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        userSessions.push({
          id,
          name: session.name,
          path: session.cwd,
          shell: session.shell,
          cols: session.cols,
          rows: session.rows,
          audited: session.audited,
          status: 'active',
          started_at: new Date(session.createdAt).toISOString()
        });
      }
    }
    return userSessions;
  }

  /**
   * Persist session to database
   */
  async persistSession(sessionId, session) {
    const cols = ['id', 'user_id', 'name', 'path', 'shell', 'cols', 'rows', 'audited', 'status', 'started_at', 'created_at', 'updated_at'];
    const vals = [
      sessionId,
      session.userId,
      session.name,
      session.cwd,
      session.shell,
      session.cols,
      session.rows,
      session.audited,
      'active',
      new Date(session.createdAt).toISOString(),
      new Date(session.createdAt).toISOString(),
      new Date().toISOString()
    ];

    try {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO terminal_sessions (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          vals,
          (err) => err ? reject(err) : resolve()
        );
      });
    } catch (err) {
      // Table may not exist
      logger.debug('Terminal session persistence skipped:', err.message);
    }
  }

  /**
   * Get shell path based on shell name
   */
  getShellPath(shell) {
    const shells = {
      'bash': 'bash',
      'zsh': 'zsh',
      'fish': 'fish',
      'sh': 'sh',
      'powershell': os.platform() === 'win32' ? 'powershell.exe' : 'pwsh',
      'cmd': os.platform() === 'win32' ? 'cmd.exe' : 'cmd'
    };
    return shells[shell] || 'bash';
  }

  /**
   * Kill all sessions for user
   */
  killAllUserSessions(userId) {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.closeSession(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Audit log entry for command
   */
  async auditCommand(sessionId, userId, command, output, exitCode) {
    try {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO terminal_audit (session_id, user_id, command, output, exit_code, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [sessionId, userId, command, output || '', exitCode || 0],
          (err) => err ? reject(err) : resolve()
        );
      });
    } catch (err) {
      logger.debug('Audit log failed:', err.message);
    }
  }
}

module.exports = new TerminalService();