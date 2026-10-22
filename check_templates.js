const db = require('./config/db');
console.log(db.prepare("SELECT role, service_type, COUNT(*) as count FROM workspace_permission_templates GROUP BY role, service_type").all());