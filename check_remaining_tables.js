const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
for (const t of ['terminal_sessions', 'terminal_command_history', 'terminal_permissions', 'terminal_audit', 'audit_logs', 'security_alerts', 'security_alert_rules', 'doctor_checks', 'doctor_scans', 'doctor_fixes', 'login_page_settings', 'workspace_login_overrides', 'marketplace_items', 'marketplace_reviews', 'marketplace_blueprints', 'service_categories', 'service_types', 'ai_agent_conversations', 'ai_hosting_instances', 'api_endpoints', 'api_usage_logs', 'api_keys', 'webhooks', 'webhook_deliveries']) {
  const e = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  console.log(t + ":", !!e);
  if (e) {
    console.log("  cols:", db.prepare("PRAGMA table_info(" + t + ")").all().map(c => c.name).join(", "));
  }
}