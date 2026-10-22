const db = require('./config/db');
const tables = ['workspaces', 'workspace_members', 'workspace_services', 'workspace_domains', 'workspace_resources', 'workspace_permissions', 'workspace_activity', 'workspace_permission_templates'];
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
  console.log(`${t}: ${count.c} rows`);
});