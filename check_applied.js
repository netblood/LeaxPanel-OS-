const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
const applied = db.prepare('SELECT version, filename FROM schema_migrations ORDER BY version').all();
console.log('Applied migrations:');
applied.forEach(a => console.log(`  ${a.version}: ${a.filename}`));