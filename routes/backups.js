const express = require('express');
const router = express.Router();
const db = require('../config/db');
const backupService = require('../services/backupService');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { formatBytes, formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');

const TYPES = ['manual', 'scheduled', 'database', 'files', 'snapshot'];

router.get('/', (req, res) => {
  try {
    const backups = db.all('SELECT * FROM backups ORDER BY created_at DESC').map(b => ({
      ...b,
      sizeLabel: b.size_bytes ? formatBytes(b.size_bytes) : '—',
      createdLabel: formatDate(b.created_at, true)
    }));
    const snapshots = db.all('SELECT * FROM backup_snapshots ORDER BY created_at DESC LIMIT 50');
    const totalSize = backups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);
    res.render('backups/index', {
      title: 'Backups',
      pageTitle: 'Backups',
      pageSubtitle: 'Snapshots, restore points and scheduled archives',
      backups,
      rows: backups,
      snapshots,
      totalSizeLabel: formatBytes(totalSize),
      types: TYPES
    });
  } catch (err) {
    logger.error('Backups error:', err);
    res.render('backups/index', { title: 'Backups', pageTitle: 'Backups', backups: [], rows: [], snapshots: [], types: TYPES });
  }
});

router.get('/create', (req, res) => {
  res.render('backups/create', { title: 'Create backup', pageTitle: 'Create backup', types: TYPES });
});

router.post('/create', handleValidationErrors, (req, res) => {
  try {
    const name = String(req.body.name || '').trim() || 'Manual Backup';
    const type = TYPES.includes(req.body.type) ? req.body.type : 'manual';
    backupService.createBackup(name, type, req.session.user.id);
    req.flash('success', 'Backup created successfully.');
    res.redirect('/backups');
  } catch (err) {
    logger.error('Create backup error:', err);
    req.flash('error', `Failed to create backup: ${err.message}`);
    res.redirect('/backups/create');
  }
});

router.get('/:id', idParam, handleValidationErrors, (req, res) => {
  try {
    const backup = db.get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (!backup) {
      req.flash('error', 'Backup not found.');
      return res.redirect('/backups');
    }
    const snapshots = db.all('SELECT * FROM backup_snapshots WHERE backup_id = ? ORDER BY created_at DESC', [backup.id]);
    res.render('backups/show', {
      title: backup.name,
      pageTitle: backup.name,
      backup,
      item: backup,
      sizeLabel: backup.size_bytes ? formatBytes(backup.size_bytes) : '0 Bytes',
      snapshots: snapshots.map(s => ({ ...s, sizeLabel: s.size_bytes ? formatBytes(s.size_bytes) : '—' }))
    });
  } catch (err) {
    logger.error('Backup detail error:', err);
    req.flash('error', 'Failed to load backup.');
    res.redirect('/backups');
  }
});

router.post('/:id/restore', idParam, handleValidationErrors, (req, res) => {
  try {
    const backup = db.get('SELECT * FROM backups WHERE id = ?', [req.params.id]);
    if (!backup) {
      req.flash('error', 'Backup not found.');
      return res.redirect('/backups');
    }
    db.run(
      "UPDATE backup_snapshots SET status = 'restored', restore_point = datetime('now') WHERE backup_id = ? AND status = 'available'",
      [backup.id]
    );
    req.flash('success', 'Restore point created from this backup.');
    res.redirect(`/backups/${backup.id}`);
  } catch (err) {
    logger.error('Restore error:', err);
    req.flash('error', 'Failed to restore backup.');
    res.redirect('/backups');
  }
});

router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
  try {
    db.run('DELETE FROM backups WHERE id = ?', [req.params.id]);
    req.flash('success', 'Backup deleted.');
    res.redirect('/backups');
  } catch (err) {
    req.flash('error', 'Failed to delete backup.');
    res.redirect('/backups');
  }
});

module.exports = router;
module.exports.TYPES = TYPES;
