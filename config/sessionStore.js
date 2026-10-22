// SQLite-backed express-session store.
// Removes the MemoryStore warning and makes sessions survive restarts
// without requiring Redis.
const session = require('express-session');
const db = require('./db');

const Store = session.Store;

class SQLiteSessionStore extends Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || 86400000;
    this.cleanupInterval = options.cleanupInterval || 15 * 60 * 1000;
    this.table = options.table || 'sessions';

    this.ensureTable();
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  ensureTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${this.table}_expire ON ${this.table}(expire);
    `);
  }

  cleanup() {
    try {
      db.run(`DELETE FROM ${this.table} WHERE expire < ?`, [Date.now()]);
    } catch (err) {
      // best effort - never crash the process on cleanup failure
    }
  }

  get(sid, callback) {
    try {
      const row = db.get(
        `SELECT sess, expire FROM ${this.table} WHERE sid = ?`,
        [sid]
      );
      if (!row) return callback(null, null);
      if (row.expire < Date.now()) {
        db.run(`DELETE FROM ${this.table} WHERE sid = ?`, [sid]);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.sess));
    } catch (err) {
      return callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      const maxAge = sess && sess.cookie && sess.cookie.maxAge
        ? sess.cookie.maxAge
        : this.ttl;
      const expire = Date.now() + maxAge;
      db.run(
        `INSERT INTO ${this.table} (sid, sess, expire) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire`,
        [sid, JSON.stringify(sess), expire]
      );
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      db.run(`DELETE FROM ${this.table} WHERE sid = ?`, [sid]);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  touch(sid, sess, callback) {
    try {
      const maxAge = sess && sess.cookie && sess.cookie.maxAge
        ? sess.cookie.maxAge
        : this.ttl;
      db.run(
        `UPDATE ${this.table} SET expire = ?, sess = ? WHERE sid = ?`,
        [Date.now() + maxAge, JSON.stringify(sess), sid]
      );
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  length(callback) {
    try {
      const row = db.get(`SELECT COUNT(*) AS count FROM ${this.table}`);
      return callback(null, row ? row.count : 0);
    } catch (err) {
      return callback(err);
    }
  }

  clear(callback) {
    try {
      db.run(`DELETE FROM ${this.table}`);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }
}

module.exports = SQLiteSessionStore;
