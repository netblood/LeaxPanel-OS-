const db = require('./config/db');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='workspace_permission_templates'").get());