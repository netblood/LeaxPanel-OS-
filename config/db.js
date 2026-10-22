// LeaxPanel Database Layer
// SQLite via better-sqlite3 - no PostgreSQL / Redis / Docker required.
//
// Exposes a small, explicit API instead of emulating the `pg` interface:
//   all(sql, params)      -> array of rows
//   get(sql, params)      -> first row or undefined
//   run(sql, params)      -> { changes, lastInsertRowid }
//   exec(sql)             -> multi-statement script (migrations/seeds)
//   tx(fn)                -> transaction wrapper
//   prepare(sql)          -> cached statement
//
// A compatibility shim (query/get/run) is kept so legacy route code that
// expects `{ rows, rowCount }` keeps working while the codebase migrates.
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const configuredPath = process.env.DB_PATH || './data/leaxos.db';

const dataDir = path.isAbsolute(configuredPath)
  ? path.dirname(configuredPath)
  : path.join(ROOT, path.dirname(configuredPath));

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.join(ROOT, configuredPath);

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

const statementCache = new Map();

function prepare(sql) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

function all(sql, params = []) {
  return prepare(sql).all(params);
}

function getRow(sql, params = []) {
  return prepare(sql).get(params);
}

function run(sql, params = []) {
  const result = prepare(sql).run(params);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid
  };
}

function exec(sql) {
  db.exec(sql);
}

function tx(fn) {
  return db.transaction(fn);
}

// ---------------------------------------------------------------------------
// Compatibility shim for legacy `pool.query(...)` call sites.
// ---------------------------------------------------------------------------
function query(sql, params = []) {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('WITH')) {
    const rows = all(sql, params);
    return { rows, rowCount: rows.length };
  }

  if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    const result = run(sql, params);
    return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  // DDL and multi-statement scripts
  exec(sql);
  return { rows: [], rowCount: 0 };
}

function getOne(sql, params = []) {
  const row = getRow(sql, params);
  return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
}

const pool = {
  // modern API
  db,
  all,
  get: getRow,
  run,
  exec,
  tx,
  prepare,
  // legacy API
  query,
  getOne,
  end: () => { try { db.close(); } catch (_) { /* already closed */ } }
};

module.exports = pool;
module.exports.all = all;
module.exports.get = getRow;
module.exports.run = run;
module.exports.exec = exec;
module.exports.tx = tx;
module.exports.prepare = prepare;
module.exports.query = query;
module.exports.getOne = getOne;
