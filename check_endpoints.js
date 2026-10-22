const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
console.log('api_endpoints exists:', db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='api_endpoints'").get());
if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='api_endpoints'").get()) {
  console.log('api_endpoints columns:', db.prepare('PRAGMA table_info(api_endpoints)').all().map(c => c.name).join(', '));
}