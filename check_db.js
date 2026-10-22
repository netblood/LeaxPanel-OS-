const db = require('./config/db');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'workspace%'").all());