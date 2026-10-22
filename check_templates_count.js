const db = require('./config/db');
console.log(db.prepare("SELECT COUNT(*) as c FROM workspace_permission_templates").get());