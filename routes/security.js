const express = require('express');
const router = express.Router();
const db = require('../config/db');
const securityService = require('../services/securityService');
const rbac = require('../middleware/rbac');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const events = securityService.listEvents(100);
    const summary = securityService.securitySummary();
    const blacklist = securityService.listIpLists('blacklist');
    const whitelist = securityService.listIpLists('whitelist');
    const auditLogs = db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60');
    const roles = rbac.ROLES;

    res.render('security/index', {
      title: 'Security',
      pageTitle: 'Security',
      pageSubtitle: 'Audit trail, access control, IP lists and hardening status',
      score: summary.score,
      events,
      rows: events,
      blacklist,
      whitelist,
      auditLogs,
      roles
    });
  } catch (err) {
    logger.error('Security page error:', err);
    res.render('security/index', { title: 'Security', pageTitle: 'Security', score: 0, events: [], rows: [], blacklist: [], whitelist: [], auditLogs: [], roles: rbac.ROLES });
  }
});

router.post('/ip-list', handleValidationErrors, (req, res) => {
  try {
    const ip = String(req.body.ip_address || '').trim();
    const listType = req.body.list_type === 'whitelist' ? 'whitelist' : 'blacklist';
    if (!ip) {
      req.flash('error', 'An IP address is required.');
      return res.redirect('/security');
    }
    securityService.addIp(ip, listType, String(req.body.note || '').trim());
    req.flash('success', `IP ${ip} added to the ${listType}.`);
  } catch (err) {
    logger.error('Add IP error:', err);
    req.flash('error', `Failed to add IP address: ${err.message}`);
  }
  res.redirect('/security');
});

router.post('/ip-list/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    securityService.removeIp(req.params.id);
    req.flash('success', 'IP address removed.');
  } catch (err) {
    req.flash('error', 'Failed to remove IP address.');
  }
  res.redirect('/security');
});

router.post('/event/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    db.run('DELETE FROM security_events WHERE id = ?', [req.params.id]);
    req.flash('success', 'Security event removed.');
  } catch (err) {
    req.flash('error', 'Failed to remove security event.');
  }
  res.redirect('/security');
});

router.get('/audit', (req, res) => {
  try {
    const logs = db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').map(l => ({
      ...l,
      createdLabel: formatDate(l.created_at, true)
    }));
    res.render('security/audit', { title: 'Audit log', pageTitle: 'Audit log', logs, rows: logs });
  } catch (err) {
    logger.error('Audit log error:', err);
    res.render('security/audit', { title: 'Audit log', pageTitle: 'Audit log', logs: [], rows: [] });
  }
});

module.exports = router;
