const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('Tables:', tables.join(', '));
if (tables.includes('api_keys')) {
  console.log('api_keys columns:', db.prepare('PRAGMA table_info(api_keys)').all().map(c => c.name).join(', '));
}