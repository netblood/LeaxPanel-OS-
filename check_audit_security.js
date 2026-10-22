const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
console.log('audit_logs columns:', db.prepare('PRAGMA table_info(audit_logs)').all().map(c => c.name).join(', '));
console.log('security_alerts columns:', db.prepare('PRAGMA table_info(security_alerts)').all().map(c => c.name).join(', '));