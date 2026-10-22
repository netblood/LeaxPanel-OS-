const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
console.log('file_manager_files columns:', db.prepare('PRAGMA table_info(file_manager_files)').all().map(c => c.name).join(', '));