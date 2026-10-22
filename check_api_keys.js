const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
console.log('api_keys columns:', db.prepare('PRAGMA table_info(api_keys)').all().map(c => c.name).join(', '));