// Cloudflare management routes
const express = require('express');
const router = express.Router();
const cloudflareService = require('../services/cloudflareService');
const panelSettings = require('../services/panelSettingsService');
const domainManager = require('../services/domainManager');
const { requireAuth } = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const logger = require('../utils/logger');

// All routes require authentication and admin permission
router.use(requireAuth);
router.use(rbac.checkPermission('cloudflare:view'));

// Cloudflare dashboard
router.get('/', async (req, res) => {
  const apiToken = panelSettings.get('cloudflare_api_token');
  const zoneId = panelSettings.get('cloudflare_zone_id');
  const zoneName = panelSettings.get('cloudflare_zone_name');
  const configured = panelSettings.get('cloudflare_configured') === 'true';

  let validation = { success: false };
  let zones = [];
  let dnsRecords = [];

  if (configured && apiToken && zoneId) {
    try {
      validation = await cloudflareService.validateCredentials(apiToken);
      if (validation.success) {
        zones = await cloudflareService.getZones();
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          dnsRecords = await cloudflareService.getDnsRecords(zoneId);
        }
      }
    } catch (err) {
      logger.error('Cloudflare fetch error:', err);
    }
  }

  res.render('cloudflare/index', {
    title: 'Cloudflare',
    pageTitle: 'Cloudflare Management',
    pageSubtitle: 'Manage DNS records and SSL settings',
    cloudflareConfigured: configured,
    cloudflareValidated: validation.success,
    zoneName,
    zoneId,
    zones,
    dnsRecords,
    panelSettings: panelSettings.all()
  });
});

// Configure Cloudflare
router.post('/configure', async (req, res) => {
  try {
    const apiToken = String(req.body.api_token || '').trim();
    const zoneId = String(req.body.zone_id || '').trim();

    if (!apiToken || !zoneId) {
      req.flash('error', 'API Token and Zone ID are required');
      return res.redirect('/cloudflare');
    }

    const validation = await cloudflareService.validateCredentials(apiToken);
    if (!validation.success) {
      req.flash('error', `Validation failed: ${validation.error}`);
      return res.redirect('/cloudflare');
    }

    const zones = await cloudflareService.getZones();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      req.flash('error', 'Zone ID not found in your account');
      return res.redirect('/cloudflare');
    }

    panelSettings.set('cloudflare_api_token', apiToken);
    panelSettings.set('cloudflare_zone_id', zoneId);
    panelSettings.set('cloudflare_zone_name', zone.name);
    panelSettings.set('cloudflare_configured', 'true');

    req.flash('success', `Cloudflare configured for ${zone.name}`);
    res.redirect('/cloudflare');
  } catch (err) {
    logger.error('Cloudflare configure error:', err);
    req.flash('error', `Configuration failed: ${err.message}`);
    res.redirect('/cloudflare');
  }
});

// Create DNS record
router.post('/dns/create', async (req, res) => {
  try {
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');

    if (!apiToken || !zoneId) {
      return res.status(400).json({ success: false, error: 'Cloudflare not configured' });
    }

    const { type, name, content, ttl, proxied, comment } = req.body;
    const record = await cloudflareService.createDnsRecord(zoneId, { type, name, content, ttl, proxied, comment });

    res.json({ success: true, record });
  } catch (err) {
    logger.error('DNS create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update DNS record
router.post('/dns/update', async (req, res) => {
  try {
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');

    if (!apiToken || !zoneId) {
      return res.status(400).json({ success: false, error: 'Cloudflare not configured' });
    }

    const { recordId, type, name, content, ttl, proxied, comment } = req.body;
    const record = await cloudflareService.updateDnsRecord(zoneId, recordId, { type, name, content, ttl, proxied, comment });

    res.json({ success: true, record });
  } catch (err) {
    logger.error('DNS update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete DNS record
router.post('/dns/delete', async (req, res) => {
  try {
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');

    if (!apiToken || !zoneId) {
      return res.status(400).json({ success: false, error: 'Cloudflare not configured' });
    }

    const { recordId } = req.body;
    await cloudflareService.deleteDnsRecord(zoneId, recordId);

    res.json({ success: true });
  } catch (err) {
    logger.error('DNS delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Enable SSL for domain
router.post('/ssl/enable', async (req, res) => {
  try {
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');

    if (!apiToken || !zoneId) {
      return res.status(400).json({ success: false, error: 'Cloudflare not configured' });
    }

    const { hostname } = req.body;
    await cloudflareService.enableSsl(zoneId, hostname);

    res.json({ success: true, message: `SSL enabled for ${hostname}` });
  } catch (err) {
    logger.error('SSL enable error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get SSL status
router.get('/ssl/status/:hostname', async (req, res) => {
  try {
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');

    if (!apiToken || !zoneId) {
      return res.status(400).json({ success: false, error: 'Cloudflare not configured' });
    }

    const { hostname } = req.params;
    const status = await cloudflareService.getSslStatus(zoneId, hostname);

    res.json({ success: true, status });
  } catch (err) {
    logger.error('SSL status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate nginx config for all services
router.get('/nginx-config', async (req, res) => {
  const reverseProxy = require('../services/reverseProxy');
  const config = reverseProxy.generateAllNginxConfigs();

  res.set('Content-Type', 'text/plain');
  res.set('Content-Disposition', 'attachment; filename="leaxpanel-nginx.conf"');
  res.send(config);
});

// Toggle SSL setting
router.post('/ssl/toggle/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const allowedKeys = ['cloudflare_always_https', 'cloudflare_auto_https_rewrites', 'cloudflare_min_tls_version'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ success: false, error: 'Invalid setting key' });
    }

    panelSettings.set(key, String(value));
    res.json({ success: true });
  } catch (err) {
    logger.error('SSL toggle error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Cloudflare connection
router.post('/test', async (req, res) => {
  try {
    const apiToken = String(req.body.api_token || '').trim();
    if (!apiToken) {
      return res.json({ success: false, error: 'API Token required' });
    }

    const validation = await cloudflareService.validateCredentials(apiToken);
    if (!validation.success) {
      return res.json({ success: false, error: validation.error });
    }

    const zones = await cloudflareService.getZones();
    res.json({ success: true, zones });
  } catch (err) {
    logger.error('Cloudflare test error:', err);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;