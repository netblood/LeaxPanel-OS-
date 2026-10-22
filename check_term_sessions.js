const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
console.log('terminal_sessions columns:', db.prepare('PRAGMA table_info(terminal_sessions)').all().map(c => c.name).join(', '));