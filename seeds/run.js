// LeaxPanel seed runner.
// Applies every ./seeds/NNN_*.sql file in order. Safe to re-run.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const seedsDir = __dirname;

function getSeedFiles() {
  return fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Applies the administrator credentials from the environment.
 * The SQL seed uses a default hash; when ADMIN_EMAIL / ADMIN_PASSWORD are
 * configured the account is created or updated with those values.
 */
function applyAdminCredentials() {
  const email = (process.env.ADMIN_EMAIL || 'owner@leaxos.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Owner';
  const role = process.env.ADMIN_ROLE || 'owner';

  if (!password) return null;

  try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 12);
    const existing = db.get('SELECT id, password_hash FROM users WHERE lower(email) = ?', [email]);

    if (existing) {
      // Only rewrite the hash when the password actually changed.
      if (bcrypt.compareSync(password, existing.password_hash)) {
        db.run('UPDATE users SET name = ?, role = ?, is_active = 1 WHERE id = ?', [name, role, existing.id]);
        return { email, created: false, changed: false };
      }
      db.run(
        'UPDATE users SET password_hash = ?, name = ?, role = ?, is_active = 1 WHERE id = ?',
        [hash, name, role, existing.id]
      );
      return { email, created: false, changed: true };
    }

    const result = db.run(
      "INSERT INTO users (name, email, password_hash, role, is_active, email_verified, created_at) VALUES (?, ?, ?, ?, 1, 1, datetime('now'))",
      [name, email, hash, role]
    );
    db.run(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT ?, id FROM roles WHERE name = ?`,
      [result.lastInsertRowid, role]
    );
    return { email, created: true, changed: true };
  } catch (err) {
    console.error(`[seed] Could not apply the administrator credentials: ${err.message}`);
    return null;
  }
}

function runSeeds() {
  const files = getSeedFiles();
  let count = 0;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');

    try {
      db.exec(sql);
    } catch (err) {
      const ignorable = /UNIQUE|constraint|already exists/i.test(err.message);
      if (!ignorable) {
        console.error(`[seed] Failed ${file}: ${err.message}`);
      }
    }
    count++;
    console.log(`[seed] Applied ${file}`);
  }

  const admin = applyAdminCredentials();
  if (admin) {
    console.log(`[seed] Administrator ${admin.email} ${admin.created ? 'created' : 'updated'} from the environment`);
  }

  console.log(`[seed] Applied ${count} seed file(s)`);
}

if (require.main === module) {
  try {
    runSeeds();
  } catch (err) {
    console.error('[seed] Aborted:', err.message);
    process.exit(1);
  }
}

module.exports = { runSeeds };
