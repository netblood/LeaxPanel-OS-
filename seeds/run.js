const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'leaxos'}:${process.env.DB_PASSWORD || 'leaxos_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'leaxos'}`,
});

async function runSeeds() {
  const client = await pool.connect();
  try {
    const seedDir = path.join(__dirname);
    const files = fs.readdirSync(seedDir)
      .filter(f => f.endsWith('.sql') && f !== 'run.js')
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(seedDir, file), 'utf8');
      await client.query(sql);
      console.log(`Applied seed: ${file}`);
    }

    console.log('All seeds completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
