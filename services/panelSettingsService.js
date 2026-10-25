// Panel-wide settings stored in the `panel_settings` table.
// Values are cached in memory and invalidated on write.
const db = require('../config/db');
const logger = require('../utils/logger');

const DEFAULTS = {
  panel_name: 'LeaxPanel',
  panel_tagline: 'Host Anything. Manage Everything. Deploy Anywhere.',
  panel_logo: '',
  panel_favicon: '',
  primary_color: '#7c5cff',
  accent_color: '#22d3ee',
  support_email: 'support@leaxos.local',
  support_url: '',
  default_timezone: 'UTC',
  default_locale: 'en',
  registration_enabled: 'false',
  maintenance_mode: 'false',
  maintenance_message: 'LeaxPanel is under maintenance. Please check back shortly.',
  setup_completed: 'false',
  setup_step: '0',
  footer_text: 'Hosted & powered by LeaxPanel(os)',
  api_rate_limit: '120',
  
  // Cloudflare settings
  cloudflare_api_token: '',
  cloudflare_zone_id: '',
  cloudflare_zone_name: '',
  cloudflare_configured: 'false',
  cloudflare_always_https: 'false',
  cloudflare_auto_https_rewrites: 'false',
  cloudflare_min_tls_version: '1.2',
  
  // Platform domain settings
  platform_domain: '',
  platform_domain_configured: 'false',
  
  // Auto features
  auto_ssl: 'false',
  auto_dns: 'false',
  auto_subdomains: 'false',
  auto_backups: 'false',
  auto_monitoring: 'false',
  auto_firewall: 'false',
  auto_health_checks: 'false',
  auto_recovery: 'false',
  auto_security_audits: 'false',
  auto_ai_recommendations: 'false',
  
  // Security settings
  two_factor_enabled: 'false',
  session_timeout: '86400000',
  max_sessions: '5',
  password_min_length: '8',
  password_require_upper: 'false',
  password_require_numbers: 'false',
  password_require_symbols: 'false'
};

let cache = null;

function load() {
  if (cache) return cache;
  cache = { ...DEFAULTS };
  try {
    const rows = db.all('SELECT key, value FROM panel_settings');
    for (const row of rows) {
      if (row && row.key) cache[row.key] = row.value;
    }
  } catch (err) {
    logger.warn('Panel settings unavailable:', err.message);
  }
  return cache;
}

function get(key, fallback = null) {
  const settings = load();
  const value = settings[key];
  if (value === undefined || value === null || value === '') {
    return fallback !== null ? fallback : (DEFAULTS[key] !== undefined ? DEFAULTS[key] : null);
  }
  return value;
}

function getBool(key) {
  return String(get(key, 'false')).toLowerCase() === 'true';
}

function all() {
  return { ...load() };
}

function set(key, value) {
  load();
  const stringValue = value === null || value === undefined ? '' : String(value);
  db.run(
    `INSERT INTO panel_settings (key, value, type, description, updated_at)
     VALUES (?, ?, 'string', '', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, stringValue]
  );
  cache[key] = stringValue;
  return stringValue;
}

function setMany(entries) {
  const result = {};
  for (const [key, value] of Object.entries(entries || {})) {
    result[key] = set(key, value);
  }
  return result;
}

function remove(key) {
  try {
    db.run('DELETE FROM panel_settings WHERE key = ?', [key]);
  } catch (err) {
    logger.warn('Failed to remove panel setting:', err.message);
  }
  load();
  delete cache[key];
}

function invalidate() {
  cache = null;
}

function isSetupComplete() {
  return getBool('setup_completed');
}

function isRegistrationEnabled() {
  return getBool('registration_enabled');
}

function isMaintenanceMode() {
  return getBool('maintenance_mode');
}

module.exports = {
  DEFAULTS,
  get,
  getBool,
  all,
  set,
  setMany,
  remove,
  invalidate,
  isSetupComplete,
  isRegistrationEnabled,
  isMaintenanceMode
};
