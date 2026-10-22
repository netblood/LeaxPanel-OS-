const express = require('express');
const router = express.Router();
const panelSettings = require('../services/panelSettingsService');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');

const EDITABLE = [
  'panel_name',
  'panel_tagline',
  'panel_logo',
  'primary_color',
  'accent_color',
  'support_email',
  'support_url',
  'default_timezone',
  'default_locale',
  'footer_text',
  'registration_enabled',
  'billing_enabled',
  'billing_provider',
  'maintenance_mode',
  'maintenance_message'
];

router.get('/', (req, res) => {
  res.render('settings/index', {
    title: 'Settings',
    pageTitle: 'Settings',
    pageSubtitle: 'Panel branding, registration, billing and maintenance',
    settings: panelSettings.all(),
    editable: EDITABLE
  });
});

router.post('/', handleValidationErrors, (req, res) => {
  try {
    const payload = {};
    for (const key of EDITABLE) {
      if (key in req.body) {
        payload[key] = typeof req.body[key] === 'string' && req.body[key].trim() === ''
          ? ''
          : req.body[key];
      }
    }
    panelSettings.setMany(payload);
    req.flash('success', 'Settings saved successfully.');
  } catch (err) {
    logger.error('Save settings error:', err);
    req.flash('error', `Failed to save settings: ${err.message}`);
  }
  res.redirect('/settings');
});

router.post('/reset', (req, res) => {
  try {
    panelSettings.invalidate();
    req.flash('success', 'Settings cache refreshed.');
  } catch (err) {
    req.flash('error', 'Failed to refresh settings.');
  }
  res.redirect('/settings');
});

module.exports = router;
module.exports.EDITABLE = EDITABLE;
