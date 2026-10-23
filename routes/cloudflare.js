// Cloudflare management routes
const express = require('express');
const router = express.Router();
const cloudflareService = require('../services/cloudflareService');
const panelSettings = require('../services/panelSettingsService');
const { requireAuth } = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const logger = require('../utils/logger');

// All routes require authentication and admin permission
router.use(requireAuth);
router.use(rbac.checkPermission('cloudflare:view'));

// Traditional form submissions should be redirected back to the page;
// fetch()/XHR callers expect JSON.
function wantsHtml(req) {
  const contentType = req.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    return true;
  }
  return (req.get('accept') || '').includes('text/html');
}

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
      validation = await cloudflareService.validateToken(apiToken);
      if (validation.success) {
        const zonesResult = await cloudflareService.listZones(apiToken);
        zones = zonesResult.success && Array.isArray(zonesResult.result) ? zonesResult.result : [];
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          const recordsResult = await cloudflareService.listRecords(apiToken, zoneId);
          dnsRecords = recordsResult.success && Array.isArray(recordsResult.result) ? recordsResult.result : [];
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

    const validation = await cloudflareService.validateToken(apiToken);
    if (!validation.success) {
      req.flash('error', `Validation failed: ${validation.error}`);
      return res.redirect('/cloudflare');
    }

    const zonesResult = await cloudflareService.listZones(apiToken);
    const zones = zonesResult.success && Array.isArray(zonesResult.result) ? zonesResult.result : [];
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
    const recordPayload = {
      type,
      name,
      content,
      ttl: Number(ttl) || 1,
      proxied: String(proxied) === 'true' || proxied === true
    };
    if (comment) recordPayload.comment = comment;

    const result = await cloudflareService.createRecord(apiToken, zoneId, recordPayload);
    if (!result.success) {
      if (wantsHtml(req)) {
        req.flash('error', result.error || 'Failed to create DNS record');
        return res.redirect('/cloudflare');
      }
      return res.status(400).json({ success: false, error: result.error || 'Failed to create DNS record' });
    }

    if (wantsHtml(req)) {
      req.flash('success', 'DNS record created');
      return res.redirect('/cloudflare');
    }

    res.json({ success: true, record: result.result });
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
    if (!recordId) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const recordPayload = {
      type,
      name,
      content,
      ttl: Number(ttl) || 1,
      proxied: String(proxied) === 'true' || proxied === true
    };
    if (comment) recordPayload.comment = comment;

    const result = await cloudflareService.updateRecord(apiToken, zoneId, recordId, recordPayload);
    if (!result.success) {
      if (wantsHtml(req)) {
        req.flash('error', result.error || 'Failed to update DNS record');
        return res.redirect('/cloudflare');
      }
      return res.status(400).json({ success: false, error: result.error || 'Failed to update DNS record' });
    }

    if (wantsHtml(req)) {
      req.flash('success', 'DNS record updated');
      return res.redirect('/cloudflare');
    }

    res.json({ success: true, record: result.result });
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

    const { recordId, recordName } = req.body;
    if (!recordId && !recordName) {
      return res.status(400).json({ success: false, error: 'Record ID is required' });
    }

    const result = recordId
      ? await cloudflareService.deleteRecordById(apiToken, zoneId, recordId)
      : await cloudflareService.deleteRecord(apiToken, zoneId, recordName);

    if (!result.success) {
      if (wantsHtml(req)) {
        req.flash('error', result.error || 'Failed to delete DNS record');
        return res.redirect('/cloudflare');
      }
      return res.status(400).json({ success: false, error: result.error || 'Failed to delete DNS record' });
    }

    if (wantsHtml(req)) {
      req.flash('success', 'DNS record deleted');
      return res.redirect('/cloudflare');
    }

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
    if (!hostname) {
      return res.status(400).json({ success: false, error: 'Hostname is required' });
    }

    const alwaysHttps = await cloudflareService.enableAlwaysHTTPS(apiToken, zoneId);
    if (!alwaysHttps.success) {
      return res.status(400).json({ success: false, error: alwaysHttps.error || 'Failed to enable Always Use HTTPS' });
    }

    const autoRewrites = await cloudflareService.enableAutoHTTPSRewrites(apiToken, zoneId);
    if (!autoRewrites.success) {
      return res.status(400).json({ success: false, error: autoRewrites.error || 'Failed to enable Automatic HTTPS Rewrites' });
    }

    panelSettings.set('cloudflare_always_https', 'true');
    panelSettings.set('cloudflare_auto_https_rewrites', 'true');

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
    const statusResult = await cloudflareService.getSSLCertificateStatus(apiToken, zoneId);
    if (!statusResult.success) {
      return res.status(400).json({ success: false, error: statusResult.error || 'Failed to fetch SSL status' });
    }

    res.json({ success: true, status: statusResult.result, hostname });
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

    const storedValue = typeof value === 'boolean' ? String(value) : String(value ?? '');

    // Keep Cloudflare in sync when the zone is configured.
    const apiToken = panelSettings.get('cloudflare_api_token');
    const zoneId = panelSettings.get('cloudflare_zone_id');
    if (apiToken && zoneId) {
      const cfSettings = {
        cloudflare_always_https: { name: 'always_use_https', on: 'on', off: 'off' },
        cloudflare_auto_https_rewrites: { name: 'automatic_https_rewrites', on: 'on', off: 'off' },
        cloudflare_min_tls_version: { name: 'min_tls_version', passthrough: true }
      }[key];

      let cfValue = storedValue;
      if (cfSettings.passthrough) {
        cfValue = storedValue;
      } else {
        cfValue = storedValue === 'true' ? cfSettings.on : cfSettings.off;
      }

      const cfResult = await cloudflareService.setZoneSetting(apiToken, zoneId, cfSettings.name, cfValue);
      if (!cfResult.success) {
        logger.warn(`Cloudflare setting update failed for ${key}:`, cfResult.error);
        return res.status(400).json({ success: false, error: cfResult.error || 'Failed to update Cloudflare setting' });
      }
    }

    panelSettings.set(key, storedValue);
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

    const validation = await cloudflareService.validateToken(apiToken);
    if (!validation.success) {
      return res.json({ success: false, error: validation.error });
    }

    const zonesResult = await cloudflareService.listZones(apiToken);
    if (!zonesResult.success) {
      return res.json({ success: false, error: zonesResult.error || 'Failed to list zones' });
    }
    res.json({ success: true, zones: zonesResult.result });
  } catch (err) {
    logger.error('Cloudflare test error:', err);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;