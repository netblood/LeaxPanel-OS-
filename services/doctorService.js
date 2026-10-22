// LeaxPanel Doctor - health checks for the whole installation.
// Each check returns { id, label, status: 'ok'|'warn'|'fail', message, fixable, fix }
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const systemService = require('./systemService');
const panelSettings = require('./panelSettingsService');
const logger = require('../utils/logger');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const STATUS = { OK: 'ok', WARN: 'warn', FAIL: 'fail' };

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  const ok = major >= 22;
  return {
    id: 'node',
    label: 'Node.js Runtime',
    status: ok ? STATUS.OK : STATUS.FAIL,
    message: `v${process.version} (${ok ? 'supported' : 'Node.js 22+ required'})`,
    fixable: false
  };
}

function checkDatabase() {
  try {
    const row = db.get('SELECT COUNT(*) AS count FROM users');
    return {
      id: 'database',
      label: 'Database Connection',
      status: STATUS.OK,
      message: `SQLite connected · ${row ? row.count : 0} users registered`,
      fixable: false
    };
  } catch (err) {
    return {
      id: 'database',
      label: 'Database Connection',
      status: STATUS.FAIL,
      message: err.message,
      fixable: false
    };
  }
}

function checkMigrations() {
  try {
    const applied = db.all('SELECT filename FROM schema_migrations');
    const files = fs.readdirSync(path.join(ROOT, 'migrations')).filter(f => f.endsWith('.sql'));
    const appliedNames = new Set(applied.map(r => r.filename || r.name));
    const pending = files.filter(f => !appliedNames.has(f));
    return {
      id: 'migrations',
      label: 'Database Migrations',
      status: pending.length ? STATUS.WARN : STATUS.OK,
      message: pending.length
        ? `${pending.length} pending migration(s): ${pending.slice(0, 3).join(', ')}`
        : `${files.length} migrations applied`,
      fixable: pending.length > 0,
      fix: 'migrate'
    };
  } catch (err) {
    return {
      id: 'migrations',
      label: 'Database Migrations',
      status: STATUS.FAIL,
      message: err.message,
      fixable: true,
      fix: 'migrate'
    };
  }
}

function checkSeed() {
  try {
    const row = db.get('SELECT COUNT(*) AS count FROM users');
    if (!row || row.count === 0) {
      return {
        id: 'seed',
        label: 'Administrator Account',
        status: STATUS.FAIL,
        message: 'No users exist - run the seed to create the owner account',
        fixable: true,
        fix: 'seed'
      };
    }
    const owner = db.get("SELECT email FROM users WHERE role = 'owner' LIMIT 1");
    return {
      id: 'seed',
      label: 'Administrator Account',
      status: STATUS.OK,
      message: owner ? `Owner: ${owner.email}` : `${row.count} users registered`,
      fixable: false
    };
  } catch (err) {
    return {
      id: 'seed',
      label: 'Administrator Account',
      status: STATUS.FAIL,
      message: err.message,
      fixable: true,
      fix: 'seed'
    };
  }
}

function checkDirectories() {
  const results = [];
  let worst = STATUS.OK;
  for (const [label, dir] of [['Data Directory', DATA_DIR], ['Upload Directory', UPLOAD_DIR], ['Log Directory', path.join(ROOT, 'logs')], ['Backup Directory', path.join(ROOT, 'backups')]]) {
    if (!fs.existsSync(dir)) {
      results.push(`${label}: missing`);
      worst = STATUS.FAIL;
    } else {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
        results.push(`${label}: writable`);
      } catch (err) {
        results.push(`${label}: not writable`);
        worst = STATUS.FAIL;
      }
    }
  }
  return {
    id: 'directories',
    label: 'Storage Directories',
    status: worst,
    message: results.join(' · '),
    fixable: worst === STATUS.FAIL,
    fix: 'directories'
  };
}

async function checkPorts() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const free = await systemService.isPortFree(port);
  return {
    id: 'ports',
    label: 'Network Ports',
    status: free ? STATUS.OK : STATUS.OK,
    message: free
      ? `Port ${port} is available (panel is currently bound to it)`
      : `Port ${port} in use by the running panel`,
    fixable: false
  };
}

function checkEnvSecrets() {
  const problems = [];
  if (!process.env.SESSION_SECRET) problems.push('SESSION_SECRET missing');
  if (!process.env.JWT_SECRET) problems.push('JWT_SECRET missing');
  if (!process.env.ENCRYPTION_KEY) problems.push('ENCRYPTION_KEY missing');
  return {
    id: 'secrets',
    label: 'Security Secrets',
    status: problems.length ? STATUS.WARN : STATUS.OK,
    message: problems.length ? problems.join(', ') : 'All required secrets are configured',
    fixable: problems.length > 0,
    fix: 'secrets'
  };
}

function checkPermissions() {
  try {
    const owner = db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
    const admins = db.get("SELECT COUNT(*) AS count FROM users WHERE role IN ('owner','admin')");
    if (!owner || owner.count === 0) {
      return {
        id: 'permissions',
        label: 'Roles & Permissions',
        status: STATUS.FAIL,
        message: 'No owner account found',
        fixable: true,
        fix: 'seed'
      };
    }
    return {
      id: 'permissions',
      label: 'Roles & Permissions',
      status: STATUS.OK,
      message: `${owner.count} owner(s), ${admins.count} admin(s) configured`,
      fixable: false
    };
  } catch (err) {
    return {
      id: 'permissions',
      label: 'Roles & Permissions',
      status: STATUS.FAIL,
      message: err.message,
      fixable: false
    };
  }
}

function checkBackups() {
  try {
    const row = db.get("SELECT COUNT(*) AS count FROM backups WHERE status = 'completed'");
    const count = row ? row.count : 0;
    return {
      id: 'backups',
      label: 'Backup System',
      status: count ? STATUS.OK : STATUS.WARN,
      message: count ? `${count} completed backup(s)` : 'No completed backups yet',
      fixable: false
    };
  } catch (err) {
    return {
      id: 'backups',
      label: 'Backup System',
      status: STATUS.WARN,
      message: err.message,
      fixable: false
    };
  }
}

function checkLogs() {
  try {
    const logDir = path.join(ROOT, 'logs');
    if (!fs.existsSync(logDir)) {
      return {
        id: 'logs',
        label: 'Log Files',
        status: STATUS.WARN,
        message: 'Log directory not created yet',
        fixable: true,
        fix: 'directories'
      };
    }
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    return {
      id: 'logs',
      label: 'Log Files',
      status: STATUS.OK,
      message: `${files.length} log file(s) in logs/`,
      fixable: false
    };
  } catch (err) {
    return {
      id: 'logs',
      label: 'Log Files',
      status: STATUS.WARN,
      message: err.message,
      fixable: false
    };
  }
}

function checkDomains() {
  try {
    const row = db.get('SELECT COUNT(*) AS count FROM domains');
    const count = row ? row.count : 0;
    return {
      id: 'domains',
      label: 'Domains & SSL',
      status: STATUS.OK,
      message: count ? `${count} domain(s) registered` : 'No domains configured yet',
      fixable: false
    };
  } catch (err) {
    return {
      id: 'domains',
      label: 'Domains & SSL',
      status: STATUS.WARN,
      message: err.message,
      fixable: false
    };
  }
}

function checkSetup() {
  const complete = panelSettings.isSetupComplete();
  return {
    id: 'setup',
    label: 'Setup Wizard',
    status: complete ? STATUS.OK : STATUS.WARN,
    message: complete ? 'Setup wizard completed' : 'Setup wizard has not been completed',
    fixable: !complete,
    fix: 'setup'
  };
}

async function runAll() {
  const checks = [
    checkNodeVersion(),
    checkDatabase(),
    checkMigrations(),
    checkSeed(),
    checkDirectories(),
    await checkPorts(),
    checkEnvSecrets(),
    checkPermissions(),
    checkDomains(),
    checkBackups(),
    checkLogs(),
    checkSetup()
  ];

  const summary = {
    total: checks.length,
    ok: checks.filter(c => c.status === STATUS.OK).length,
    warn: checks.filter(c => c.status === STATUS.WARN).length,
    fail: checks.filter(c => c.status === STATUS.FAIL).length
  };
  summary.score = Math.round(((summary.ok + summary.warn * 0.5) / summary.total) * 100);

  return { checks, summary, generatedAt: new Date().toISOString() };
}

function applyFix(fix) {
  const { execFileSync } = require('child_process');
  try {
    switch (fix) {
      case 'migrate':
        execFileSync(process.execPath, [path.join(ROOT, 'migrations', 'run.js')], { cwd: ROOT, stdio: 'pipe' });
        return { success: true, message: 'Migrations applied successfully' };
      case 'seed':
        execFileSync(process.execPath, [path.join(ROOT, 'seeds', 'run.js')], { cwd: ROOT, stdio: 'pipe' });
        return { success: true, message: 'Seeds applied successfully' };
      case 'directories': {
        for (const dir of [DATA_DIR, UPLOAD_DIR, path.join(ROOT, 'logs'), path.join(ROOT, 'backups')]) {
          fs.mkdirSync(dir, { recursive: true });
        }
        return { success: true, message: 'Required directories created' };
      }
      case 'secrets': {
        const crypto = require('crypto');
        const envPath = path.join(ROOT, '.env');
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        for (const key of ['SESSION_SECRET', 'JWT_SECRET', 'ENCRYPTION_KEY']) {
          if (new RegExp(`^${key}=.+`, 'm').test(content)) continue;
          const value = crypto.randomBytes(48).toString('hex');
          content += `${content.endsWith('\n') || !content ? '' : '\n'}${key}=${value}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf8');
        return { success: true, message: 'Missing secrets generated in .env (restart the panel to apply)' };
      }
      case 'setup':
        return { success: true, message: 'Open the setup wizard to continue' };
      default:
        return { success: false, message: `Unknown fix: ${fix}` };
    }
  } catch (err) {
    logger.error('Doctor fix failed:', err);
    return { success: false, message: err.message };
  }
}

module.exports = {
  STATUS,
  runAll,
  applyFix,
  checkNodeVersion,
  checkDatabase,
  checkMigrations,
  checkSeed,
  checkDirectories,
  checkPorts,
  checkEnvSecrets,
  checkPermissions,
  checkDomains,
  checkBackups,
  checkLogs,
  checkSetup
};
