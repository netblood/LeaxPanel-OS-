// LeaxPanel migration runner.
// Applies every ./migrations/NNN_*.sql file in order, exactly once.
// Uses db.exec() so multi-statement SQL files (with triggers/indices) work.
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const migrationsDir = __dirname;

function getMigrationFiles() {
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      filename TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const appliedRows = db.all('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map(r => r.version));

  const files = getMigrationFiles();
  let pending = 0;

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1], 10);

    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    try {
      db.exec(sql);
    } catch (err) {
      console.error(`[migrate] Failed ${file}: ${err.message}`);
      throw err;
    }

    db.run(
      'INSERT INTO schema_migrations (version, filename, applied_at) VALUES (?, ?, datetime(\'now\'))',
      [version, file]
    );
    pending++;
    console.log(`[migrate] Applied ${file}`);
  }

  if (pending === 0) {
    console.log('[migrate] No pending migrations');
  } else {
    console.log(`[migrate] Applied ${pending} migration(s)`);
  }
}

if (require.main === module) {
  try {
    runMigrations();
  } catch (err) {
    console.error('[migrate] Aborted:', err.message);
    process.exit(1);
  }
}

module.exports = { runMigrations };
