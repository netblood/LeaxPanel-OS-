// Security Alerts routes
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const securityAlertsService = require('../services/securityAlerts');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const { severity, unacknowledged } = req.query;
    const alerts = await securityAlertsService.getAlerts(req.session.user.id, {
      severity,
      unacknowledgedOnly: unacknowledged === 'true',
      limit: 100
    });
    
    const unackCount = await securityAlertsService.getUnacknowledgedCount(req.session.user.id);
    
    res.render('securityAlerts/index', {
      title: 'Security Alerts',
      pageTitle: 'Security Alerts',
      pageSubtitle: 'Real-time security notifications and threat detection',
      alerts,
      unackCount,
      rows: alerts,
      currentSeverity: severity || '',
      showUnacknowledged: unacknowledged === 'true'
    });
  } catch (err) {
    logger.error('Security alerts page error:', err);
    res.render('securityAlerts/index', {
      title: 'Security Alerts',
      pageTitle: 'Security Alerts',
      pageSubtitle: 'Real-time security notifications',
      alerts: [], unackCount: 0, rows: []
    });
  }
});

router.post('/:id/acknowledge', idParam, handleValidationErrors, async (req, res) => {
  try {
    await securityAlertsService.acknowledgeAlert(req.params.id, req.session.user.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('Acknowledge alert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/acknowledge-all', async (req, res) => {
  try {
    const alerts = await securityAlertsService.getAlerts(req.session.user.id, { 
      unacknowledgedOnly: true, 
      limit: 100 
    });
    
    for (const alert of alerts) {
      await securityAlertsService.acknowledgeAlert(alert.id, req.session.user.id);
    }
    
    res.json({ success: true, count: alerts.length });
  } catch (err) {
    logger.error('Acknowledge all alerts error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', idParam, handleValidationErrors, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM security_alerts WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete alert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/unread-count', async (req, res) => {
  try {
    const count = await securityAlertsService.getUnacknowledgedCount(req.session.user.id);
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

module.exports = router;