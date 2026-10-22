// LeaxPanel Doctor - runs health checks and applies automatic fixes.
const express = require('express');
const router = express.Router();
const doctorService = require('../services/doctorService');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const report = await doctorService.runAll();
    res.render('doctor/index', {
      title: 'LeaxPanel Doctor',
      pageTitle: 'LeaxPanel Doctor',
      pageSubtitle: 'Diagnose and repair the installation',
      report,
      checks: report.checks,
      summary: report.summary
    });
  } catch (err) {
    logger.error('Doctor error:', err);
    res.status(500).render('errors/500', { title: 'Server Error', pageTitle: '500', errorMessage: err.message, user: req.session.user });
  }
});

router.post('/run', handleValidationErrors, async (req, res) => {
  try {
    const report = await doctorService.runAll();
    req.flash('success', `Diagnostics complete · score ${report.summary.score}%`);
  } catch (err) {
    logger.error('Doctor run error:', err);
    req.flash('error', 'Diagnostics failed.');
  }
  res.redirect('/doctor');
});

router.post('/fix', handleValidationErrors, (req, res) => {
  try {
    const fix = String(req.body.fix || '');
    const result = doctorService.applyFix(fix);
    if (result.success) {
      req.flash('success', result.message);
    } else {
      req.flash('error', `Fix failed: ${result.message}`);
    }
  } catch (err) {
    logger.error('Doctor fix error:', err);
    req.flash('error', 'Failed to apply the fix.');
  }
  res.redirect('/doctor');
});

router.post('/fix-all', handleValidationErrors, async (req, res) => {
  try {
    const report = await doctorService.runAll();
    const applied = [];
    for (const check of report.checks) {
      if (check.fixable && check.fix) {
        const result = doctorService.applyFix(check.fix);
        if (result.success) applied.push(check.label);
      }
    }
    if (applied.length) {
      req.flash('success', `Fixed: ${applied.join(', ')}`);
    } else {
      req.flash('error', 'Nothing needed fixing.');
    }
  } catch (err) {
    logger.error('Doctor fix-all error:', err);
    req.flash('error', 'Failed to apply automatic fixes.');
  }
  res.redirect('/doctor');
});

module.exports = router;
