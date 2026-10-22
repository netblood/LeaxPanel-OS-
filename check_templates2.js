const db = require('./config/db');
console.log(db.prepare("SELECT * FROM workspace_permission_templates").all());