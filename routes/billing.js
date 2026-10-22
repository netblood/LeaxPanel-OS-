const express = require('express');
const router = express.Router();
const db = require('../config/db');
const panelSettings = require('../services/panelSettingsService');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');

const STATUSES = ['draft', 'pending', 'paid', 'overdue', 'cancelled'];

router.get('/', (req, res) => {
  const enabled = panelSettings.isBillingEnabled();
  try {
    const invoices = db.all('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200').map(i => ({
      ...i,
      createdLabel: formatDate(i.created_at, true)
    }));
    const totals = {
      count: invoices.length,
      revenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0),
      pending: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount || 0), 0),
      overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + Number(i.amount || 0), 0)
    };
    res.render('billing/index', {
      title: 'Billing',
      pageTitle: 'Billing',
      pageSubtitle: 'Invoices, subscriptions and payments',
      enabled,
      provider: panelSettings.get('billing_provider', 'manual'),
      invoices,
      rows: invoices,
      totals,
      statuses: STATUSES
    });
  } catch (err) {
    logger.error('Billing error:', err);
    res.render('billing/index', { title: 'Billing', pageTitle: 'Billing', enabled, invoices: [], rows: [], totals: {}, statuses: STATUSES });
  }
});

router.get('/create', (req, res) => {
  res.render('billing/create', { title: 'Create invoice', pageTitle: 'Create invoice', statuses: STATUSES });
});

router.post('/create', handleValidationErrors, (req, res) => {
  try {
    const customer = String(req.body.customer_name || '').trim();
    if (!customer) {
      req.flash('error', 'Customer name is required.');
      return res.redirect('/billing/create');
    }
    const number = `INV-${Date.now().toString().slice(-8)}`;
    db.run(
      `INSERT INTO invoices (invoice_number, customer_name, amount, currency, status, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        number,
        customer,
        Number(req.body.amount || 0),
        String(req.body.currency || 'USD').toUpperCase(),
        STATUSES.includes(req.body.status) ? req.body.status : 'draft',
        req.session.user.id
      ]
    );
    req.flash('success', `Invoice ${number} created.`);
    res.redirect('/billing');
  } catch (err) {
    logger.error('Create invoice error:', err);
    req.flash('error', `Failed to create invoice: ${err.message}`);
    res.redirect('/billing/create');
  }
});

router.get('/:id/edit', idParam, handleValidationErrors, (req, res) => {
  try {
    const invoice = db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      req.flash('error', 'Invoice not found.');
      return res.redirect('/billing');
    }
    res.render('billing/edit', { title: 'Edit invoice', pageTitle: 'Edit invoice', invoice, values: invoice, statuses: STATUSES });
  } catch (err) {
    logger.error('Edit invoice error:', err);
    req.flash('error', 'Failed to load invoice.');
    res.redirect('/billing');
  }
});

router.post('/:id/edit', idParam, handleValidationErrors, (req, res) => {
  try {
    const invoice = db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      req.flash('error', 'Invoice not found.');
      return res.redirect('/billing');
    }
    db.run(
      `UPDATE invoices SET customer_name = ?, amount = ?, currency = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        String(req.body.customer_name || invoice.customer_name).trim(),
        Number(req.body.amount || 0),
        String(req.body.currency || 'USD').toUpperCase(),
        STATUSES.includes(req.body.status) ? req.body.status : invoice.status,
        invoice.id
      ]
    );
    req.flash('success', 'Invoice updated.');
    res.redirect('/billing');
  } catch (err) {
    logger.error('Update invoice error:', err);
    req.flash('error', `Failed to update invoice: ${err.message}`);
    res.redirect(`/billing/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    db.run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    req.flash('success', 'Invoice deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete invoice.');
  }
  res.redirect('/billing');
});

module.exports = router;
