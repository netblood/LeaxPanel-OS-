const Database = require('better-sqlite3');
const db = new Database('data/leaxos.db');

['api_usage_logs', 'webhooks', 'webhook_deliveries'].forEach(t => {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  console.log(`${t} exists:`, !!exists);
  if (exists) {
    console.log(`  columns:`, db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name).join(', '));
  }
});