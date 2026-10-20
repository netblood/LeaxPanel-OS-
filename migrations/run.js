const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'leaxos'}:${process.env.DB_PASSWORD || 'leaxos_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'leaxos'}`,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already applied migrations
    const { rows: applied } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(r => r.version));

    // Get migration files sorted
    const migrationDir = path.join(__dirname);
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql') && f !== 'run.js')
      .sort();

    for (const file of files) {
      if (appliedVersions.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed migration: ${file}`, err.message);
        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
