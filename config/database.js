// Database layer using better-sqlite3 (no PostgreSQL required)
// Single SQLite instance at ./data/leaxos.db
const { query, get, run, db } = require('./db');

const pool = {
  query,
  get,
  run,
  db,
  end: () => {}
};

module.exports = pool;
