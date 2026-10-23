const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE email = ?').get('owner@leaxos.local');
console.log('user found:', !!user);
console.log(user ? JSON.stringify(user) : 'no user');
db.close();
