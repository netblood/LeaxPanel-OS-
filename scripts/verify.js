// Post-install verification. Checks that the installation is complete and
// working. Run with: node scripts/verify.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const checks = [];
let failed = 0;

function check(label, fn) {
  let passed = false;
  let detail = '';
  try {
    const result = fn();
    passed = result === true || (result && result.ok !== false);
    detail = (result && result.detail) || '';
  } catch (err) {
    detail = err.message;
  }
  checks.push({ label, passed, detail });
  if (!passed) failed++;
  const mark = passed ? 'OK  ' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ` - ${detail}` : ''}`);
}

console.log('[verify] Running installation checks...');

check('Node.js 22+', () => {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  return major >= 22 ? { ok: true, detail: `v${process.versions.node}` } : { ok: false, detail: `v${process.versions.node} is too old` };
});

check('Dependencies installed', () => {
  const ok = fs.existsSync(path.join(ROOT, 'node_modules', 'express'));
  return ok ? { ok: true, detail: 'node_modules present' } : { ok: false, detail: 'run npm install' };
});

check('.env generated', () => {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return { ok: false, detail: 'missing .env' };
  const content = fs.readFileSync(envPath, 'utf8');
  const missing = ['SESSION_SECRET', 'JWT_SECRET', 'ENCRYPTION_KEY'].filter(k => !new RegExp(`^${k}=.+`, 'm').test(content));
  return missing.length
    ? { ok: false, detail: `missing ${missing.join(', ')}` }
    : { ok: true, detail: 'all secrets present' };
});

check('Database file created', () => {
  const dbPath = path.join(ROOT, 'data', 'leaxos.db');
  return fs.existsSync(dbPath) ? { ok: true, detail: 'data/leaxos.db' } : { ok: false, detail: 'run npm run migrate' };
});

check('Migrations applied', () => {
  const db = require(path.join(ROOT, 'config', 'db.js'));
  const row = db.get('SELECT COUNT(*) AS count FROM schema_migrations');
  return row && row.count > 0 ? { ok: true, detail: `${row.count} migrations` } : { ok: false, detail: 'no migrations applied' };
});

check('Tables created', () => {
  const db = require(path.join(ROOT, 'config', 'db.js'));
  const required = ['users', 'roles', 'permissions', 'role_permissions', 'services', 'audit_logs', 'sessions', 'panel_settings', 'apps'];
  const missing = required.filter(t => !db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [t]));
  return missing.length
    ? { ok: false, detail: `missing ${missing.join(', ')}` }
    : { ok: true, detail: `${required.length} core tables` };
});

check('Administrator account seeded', () => {
  const db = require(path.join(ROOT, 'config', 'db.js'));
  const row = db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
  return row && row.count > 0
    ? { ok: true, detail: `${row.count} owner account(s)` }
    : { ok: false, detail: 'run npm run seed' };
});

check('Roles and permissions', () => {
  const db = require(path.join(ROOT, 'config', 'db.js'));
  const roles = db.get('SELECT COUNT(*) AS count FROM roles');
  const perms = db.get('SELECT COUNT(*) AS count FROM permissions');
  return roles && roles.count > 0 && perms && perms.count > 0
    ? { ok: true, detail: `${roles.count} roles, ${perms.count} permissions` }
    : { ok: false, detail: 'run npm run seed' };
});

check('Writable directories', () => {
  const dirs = ['data', 'logs', 'backups'];
  const missing = dirs.filter(d => !fs.existsSync(path.join(ROOT, d)));
  return missing.length
    ? { ok: false, detail: `missing ${missing.join(', ')}` }
    : { ok: true, detail: dirs.join(', ') };
});

check('Views present', () => {
  const viewsDir = path.join(ROOT, 'views');
  const required = ['layout.ejs', 'home.ejs', 'dashboard/index.ejs', 'partials/sidebar.ejs', 'partials/topbar.ejs'];
  const missing = required.filter(f => !fs.existsSync(path.join(viewsDir, f)));
  return missing.length
    ? { ok: false, detail: `missing ${missing.join(', ')}` }
    : { ok: true, detail: `${required.length} key views` };
});

check('Routes load without errors', () => {
  const routesDir = path.join(ROOT, 'routes');
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  for (const file of files) require(path.join(routesDir, file));
  return { ok: true, detail: `${files.length} route modules` };
});

console.log('');
if (failed) {
  console.log(`[verify] ${failed} check(s) failed. Run http://localhost:3000/doctor for details.`);
  process.exitCode = 1;
} else {
  console.log('[verify] All checks passed. LeaxPanel is ready to run.');
}
