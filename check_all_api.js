const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');
for (const t of ['api_endpoints', 'api_usage_logs', 'api_usage_log', 'webhooks', 'webhook_deliveries']) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  console.log(`\n${t} exists:`, !!exists);
  if (exists) {
    console.log(`  columns:`, db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name).join(', '));
  }
}