const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * GET /webview
 * Site preview page - renders an iframe wrapper so users can preview
 * their deployed websites/applications from within LeaxPanel.
 */
router.get('/', authMiddleware.requireAuth, (req, res) => {
  const targetUrl = req.query.url || '';
  const panelName = (req.app.locals && req.app.locals.panelSettings
    && req.app.locals.panelSettings.panel_name) ? req.app.locals.panelSettings.panel_name : 'LeaxPanel';
  res.render('webview/index', {
    title: 'Site Preview',
    pageTitle: 'Webview / Site Preview',
    pageSubtitle: 'Preview your websites and applications',
    targetUrl,
    panelName,
    user: req.session.user || null,
    csrfToken: typeof req.csrfToken === 'function' ? req.csrfToken() : ''
  });
});

module.exports = router;
