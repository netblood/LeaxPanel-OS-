const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { timeAgo } = require('../utils/helpers');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const notifications = db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.session.user.id]
    ).map(n => ({ ...n, timeAgo: timeAgo(n.created_at) }));

    res.render('notifications/index', {
      title: 'Notifications',
      pageTitle: 'Notifications',
      pageSubtitle: 'Everything happening on your panel',
      notifications,
      rows: notifications
    });
  } catch (err) {
    logger.error('Notifications error:', err);
    res.render('notifications/index', { title: 'Notifications', pageTitle: 'Notifications', notifications: [], rows: [] });
  }
});

router.post('/:id/read', (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  } catch (err) {
    logger.warn('Mark notification read failed:', err.message);
  }
  res.redirect('/notifications');
});

router.post('/read-all', (req, res) => {
  try {
    db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.session.user.id]);
    req.flash('success', 'All notifications marked as read.');
  } catch (err) {
    req.flash('error', 'Failed to mark notifications as read.');
  }
  res.redirect('/notifications');
});

router.post('/:id/delete', (req, res) => {
  try {
    db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
  } catch (err) {
    logger.warn('Delete notification failed:', err.message);
  }
  res.redirect('/notifications');
});

module.exports = router;
