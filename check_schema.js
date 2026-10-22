const db = require('./config/db');
console.log(db.prepare("PRAGMA table_info(workspace_permission_templates)").all());