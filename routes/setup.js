// First-start setup wizard.
// Detects the environment and guides the owner through a one-click setup.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const systemService = require('../services/systemService');
const panelSettings = require('../services/panelSettingsService');
const cloudflareService = require('../services/cloudflareService');
const domainManager = require('../services/domainManager');
const rbac = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');

const STEP = process.env.SETUP_STEP || 'environment';

// Get or create setup wizard state
async function getSetupWizardState() {
  const row = db.get('SELECT * FROM setup_wizard_state ORDER BY id DESC LIMIT 1');
  if (row) return row;
  const result = db.run(`INSERT INTO setup_wizard_state (step, data, completed) VALUES ('environment', '{}', 0)`);
  return db.get('SELECT * FROM setup_wizard_state WHERE id = ?', [result.lastInsertRowid]);
}

async function updateSetupWizardState(data) {
  const state = await getSetupWizardState();
  const updates = Object.entries(data).map(([k, v]) => `${k} = ?`).join(', ');
  const values = Object.values(data);
  values.push(state.id);
  db.run(`UPDATE setup_wizard_state SET ${updates}, updated_at = datetime('now') WHERE id = ?`, values);
}

router.get('/', async (req, res) => {
  const env = await systemService.detectEnvironment();
  const hasOwner = (() => {
    try {
      const row = db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
      return row ? row.count > 0 : false;
    } catch (err) {
      return false;
    }
  })();

  // Check Cloudflare configuration
  let cloudflareConfigured = false;
  let cloudflareValidated = false;
  let zones = [];
  try {
    const cfApiToken = panelSettings.get('cloudflare_api_token');
    const cfZoneId = panelSettings.get('cloudflare_zone_id');
    if (cfApiToken && cfZoneId) {
      cloudflareConfigured = true;
      const validation = await cloudflareService.validateToken(cfApiToken);
      if (validation.success) {
        cloudflareValidated = true;
        const zonesResult = await cloudflareService.listZones(cfApiToken);
        zones = zonesResult.success && Array.isArray(zonesResult.result) ? zonesResult.result : [];
      }
    }
  } catch (err) {
    logger.warn('Cloudflare check failed:', err.message);
  }

  // Check if platform domain is configured
  const platformDomain = panelSettings.get('platform_domain');
  const platformDomainConfigured = !!platformDomain;

  // Get setup wizard state for current step
  const wizardState = await getSetupWizardState();
  const currentStep = wizardState?.step || 'environment';

  res.render('setup/index', {
    title: 'Setup wizard',
    pageTitle: 'Setup wizard',
    pageSubtitle: 'One click and LeaxPanel is ready to host anything',
    layout: false,
    user: null,
    env,
    hasOwner,
    setupComplete: panelSettings.isSetupComplete(),
    cloudflareConfigured,
    cloudflareValidated,
    zones,
    platformDomain,
    platformDomainConfigured,
    currentStep,
    steps: [
      { key: 'environment', label: 'Environment', icon: 'server' },
      { key: 'account', label: 'Administrator', icon: 'users' },
      { key: 'branding', label: 'Branding', icon: 'palette' },
      { key: 'domain', label: 'Domain Setup', icon: 'globe' },
      { key: 'security', label: 'Security Setup', icon: 'shield' },
      { key: 'services', label: 'Services', icon: 'layers' },
      { key: 'finish', label: 'Finish', icon: 'check' }
    ]
  });
});

router.post('/detect', async (req, res) => {
  try {
    const env = await systemService.detectEnvironment();
    await updateSetupWizardState({ step: 'environment', completed: 0 });
    req.flash('success', `Detected ${env.os} · Node ${env.nodeVersion}`);
  } catch (err) {
    logger.error('Setup detect error:', err);
    req.flash('error', 'Environment detection failed.');
  }
  res.redirect('/setup');
});

router.post('/account', handleValidationErrors, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 8) {
      req.flash('error', 'Name, valid email and a password of at least 8 characters are required.');
      return res.redirect('/setup');
    }

    const existing = db.get('SELECT id FROM users WHERE lower(email) = ?', [email]);
    if (existing) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/setup');
    }

    const hash = await bcrypt.hash(password, 12);
    db.run(
      "INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, 'owner', 1, datetime('now'))",
      [name, email, hash]
    );

    await updateSetupWizardState({ step: 'branding', owner_email: email, owner_name: name, completed: 0 });
    req.flash('success', `Administrator account ${email} created.`);
    res.redirect('/setup');
  } catch (err) {
    logger.error('Setup account error:', err);
    req.flash('error', `Failed to create the administrator account: ${err.message}`);
    res.redirect('/setup');
  }
});

router.post('/branding', async (req, res) => {
  try {
    const payload = {};
    if (req.body.panel_name) payload.panel_name = String(req.body.panel_name).trim();
    if (req.body.panel_tagline) payload.panel_tagline = String(req.body.panel_tagline).trim();
    if (req.body.primary_color) payload.primary_color = String(req.body.primary_color).trim();
    if (req.body.accent_color) payload.accent_color = String(req.body.accent_color).trim();
    if (req.body.support_email) payload.support_email = String(req.body.support_email).trim();
    panelSettings.setMany(payload);
    await updateSetupWizardState({ step: 'domain', completed: 0 });
    req.flash('success', 'Branding saved.');
  } catch (err) {
    logger.error('Setup branding error:', err);
    req.flash('error', 'Failed to save branding.');
  }
  res.redirect('/setup');
});

// Domain setup step - Cloudflare configuration and platform domain
router.post('/domain', handleValidationErrors, async (req, res) => {
  try {
    const wizardState = await getSetupWizardState();
    const cloudflareApiToken = String(req.body.cloudflare_api_token || '').trim();
    const cloudflareZoneId = String(req.body.cloudflare_zone_id || '').trim();
    const platformDomain = String(req.body.platform_domain || '').trim().toLowerCase();

    // Validate Cloudflare credentials if provided
    if (cloudflareApiToken && cloudflareZoneId) {
      const validation = await cloudflareService.validateToken(cloudflareApiToken);
      if (!validation.success) {
        req.flash('error', `Cloudflare validation failed: ${validation.error}`);
        return res.redirect('/setup');
      }
      
      // Verify zone ID matches
      const zonesResult = await cloudflareService.listZones(cloudflareApiToken);
      const zones = zonesResult.success && Array.isArray(zonesResult.result) ? zonesResult.result : [];
      const zone = zones.find(z => z.id === cloudflareZoneId);
      if (!zone) {
        req.flash('error', 'Invalid Cloudflare Zone ID. Please check and try again.');
        return res.redirect('/setup');
      }

      // Store encrypted credentials
      panelSettings.set('cloudflare_api_token', cloudflareApiToken);
      panelSettings.set('cloudflare_zone_id', cloudflareZoneId);
      panelSettings.set('cloudflare_zone_name', zone.name);
      panelSettings.set('cloudflare_configured', 'true');
      
      logger.info('Cloudflare credentials configured during setup');
      req.flash('success', `Cloudflare connected: ${zone.name}`);
    }

    // Set platform domain
    if (platformDomain) {
      // Validate domain format
      const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
      if (!domainRegex.test(platformDomain)) {
        req.flash('error', 'Invalid domain format. Example: apps.example.com');
        return res.redirect('/setup');
      }
      panelSettings.set('platform_domain', platformDomain);
      panelSettings.set('platform_domain_configured', 'true');
      req.flash('success', `Platform domain set to: ${platformDomain}`);
    }

    // Enable auto features
    panelSettings.set('auto_ssl', req.body.auto_ssl === 'on' ? 'true' : 'false');
    panelSettings.set('auto_dns', req.body.auto_dns === 'on' ? 'true' : 'false');
    panelSettings.set('auto_subdomains', req.body.auto_subdomains === 'on' ? 'true' : 'false');
    panelSettings.set('auto_backups', req.body.auto_backups === 'on' ? 'true' : 'false');
    panelSettings.set('auto_monitoring', req.body.auto_monitoring === 'on' ? 'true' : 'false');

    await updateSetupWizardState({ 
      step: 'security', 
      platform_domain: platformDomain || wizardState?.platform_domain,
      cloudflare_token: cloudflareApiToken || wizardState?.cloudflare_token,
      cloudflare_zone_id: cloudflareZoneId || wizardState?.cloudflare_zone_id,
      auto_ssl: req.body.auto_ssl === 'on' ? 1 : 0,
      auto_dns: req.body.auto_dns === 'on' ? 1 : 0,
      auto_backup: req.body.auto_backups === 'on' ? 1 : 0,
      auto_monitoring: req.body.auto_monitoring === 'on' ? 1 : 0,
      completed: 0 
    });
    res.redirect('/setup');
  } catch (err) {
    logger.error('Setup domain error:', err);
    req.flash('error', `Failed to save domain settings: ${err.message}`);
    res.redirect('/setup');
  }
});

// Security setup step - 2FA, sessions, password policy
router.post('/security', handleValidationErrors, async (req, res) => {
  try {
    const twoFactorEnabled = req.body.two_factor_enabled === 'on' ? 'true' : 'false';
    const sessionTimeout = parseInt(req.body.session_timeout || '86400000', 10);
    const maxSessions = parseInt(req.body.max_sessions || '5', 10);
    const passwordMinLength = parseInt(req.body.password_min_length || '8', 10);
    const passwordRequireUpper = req.body.password_require_upper === 'on' ? 'true' : 'false';
    const passwordRequireNumbers = req.body.password_require_numbers === 'on' ? 'true' : 'false';
    const passwordRequireSymbols = req.body.password_require_symbols === 'on' ? 'true' : 'false';

    panelSettings.set('two_factor_enabled', twoFactorEnabled);
    panelSettings.set('session_timeout', String(sessionTimeout));
    panelSettings.set('max_sessions', String(maxSessions));
    panelSettings.set('password_min_length', String(passwordMinLength));
    panelSettings.set('password_require_upper', passwordRequireUpper);
    panelSettings.set('password_require_numbers', passwordRequireNumbers);
    panelSettings.set('password_require_symbols', passwordRequireSymbols);

    await updateSetupWizardState({ step: 'services', completed: 0 });
    req.flash('success', 'Security settings saved.');
    res.redirect('/setup');
  } catch (err) {
    logger.error('Setup security error:', err);
    req.flash('error', `Failed to save security settings: ${err.message}`);
    res.redirect('/setup');
  }
});

router.post('/services', async (req, res) => {
  try {
    panelSettings.set('registration_enabled', req.body.registration_enabled === 'on' ? 'true' : 'false');
    await updateSetupWizardState({ step: 'finish', completed: 0 });
    req.flash('success', 'Service preferences saved.');
  } catch (err) {
    logger.error('Setup services error:', err);
    req.flash('error', 'Failed to save service preferences.');
  }
  res.redirect('/setup');
});

router.post('/finish', async (req, res) => {
  try {
    panelSettings.set('setup_completed', 'true');
    await updateSetupWizardState({ step: 'finish', completed: 1 });
    rbac.initializeRoles();
    req.flash('success', 'Setup complete. Welcome to LeaxPanel.');
  } catch (err) {
    logger.error('Setup finish error:', err);
    req.flash('error', 'Failed to finalise setup.');
  }
  res.redirect('/login');
});

module.exports = router;
