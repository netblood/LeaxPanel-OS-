// Terminal Center: browser-based terminal with project-scoped, audited sessions
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const logger = require('../utils/logger');
const terminalService = require('../services/terminalService');

router.get('/', (req, res) => {
  try {
    // Get sessions from both database and active service
    const dbSessions = db.all('SELECT * FROM terminal_sessions WHERE user_id = ? ORDER BY started_at DESC', [req.session.user.id]) || [];
    const activeSessions = terminalService.getUserSessions(req.session.user.id);
    
    // Merge active sessions with DB sessions
    const activeIds = new Set(activeSessions.map(s => s.id));
    const mergedActive = [...activeSessions];
    
    // Add DB active sessions not in service
    for (const s of dbSessions) {
      if (s.status === 'active' && !activeIds.has(s.id)) {
        mergedActive.push(s);
      }
    }
    
    const completed = dbSessions.filter(s => s.status !== 'active');
    
    res.render('terminal/index', {
      title: 'Terminal Center',
      pageTitle: 'Terminal Center',
      pageSubtitle: 'Browser-based terminal with project-scoped access, permission controlled and audited',
      sessions: mergedActive,
      history: completed,
      rows: mergedActive,
      activeCount: mergedActive.length,
      user: req.session.user
    });
  } catch (err) {
    logger.error('Terminal index error:', err);
    res.render('terminal/index', {
      title: 'Terminal Center',
      pageTitle: 'Terminal Center',
      pageSubtitle: 'Browser-based terminal with project-scoped access',
      sessions: [], history: [], rows: [], activeCount: 0,
      user: req.session.user
    });
  }
});

router.post('/create', handleValidationErrors, async (req, res) => {
  try {
    const sessionData = {
      name: String(req.body.name || 'Untitled').trim() || 'Untitled Terminal',
      path: String(req.body.path || '/home/' + req.session.user.id + '/workspace').trim(),
      shell: String(req.body.shell || 'bash'),
      cols: Number(req.body.cols) || 120,
      rows: Number(req.body.rows) || 30,
      audited: req.body.audited === '1' ? 1 : 0
    };

    // Validate path stays within workspace
    const pathModule = require('path');
    const filesRoot = pathModule.resolve(__dirname, '..', 'data', 'files');
    const resolvedPath = pathModule.resolve(filesRoot, sessionData.path.replace(/^~/, ''));
    if (!resolvedPath.startsWith(filesRoot)) {
      return res.status(400).json({ success: false, error: 'Path must be within workspace' });
    }

    const result = await terminalService.createSession(req.session.user.id, sessionData);
    
    // Audit log
    try {
      db.run(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [req.session.user.id, 'terminal.create', 'terminal_session', result.sessionId, JSON.stringify({ name: sessionData.name, path: sessionData.path, shell: sessionData.shell }), req.ip, req.get('User-Agent')]
      );
    } catch (e) { /* ignore */ }

    res.json({ success: true, sessionId: result.sessionId, session: result.session });
  } catch (err) {
    logger.error('Create terminal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/close', idParam, handleValidationErrors, (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = terminalService.getSession(sessionId);
    if (session && session.userId === req.session.user.id) {
      terminalService.closeSession(sessionId);
    }
    try {
      db.run('UPDATE terminal_sessions SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?', ['closed', sessionId, req.session.user.id]);
    } catch (e) { /* ignore */ }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/output', idParam, (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = terminalService.getSession(sessionId);
    if (!session || session.userId !== req.session.user.id) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/history', (req, res) => {
  try {
    const sessions = db.all('SELECT * FROM terminal_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 100', [req.session.user.id]) || [];
    res.json({ success: true, sessions });
  } catch (err) {
    res.json({ success: true, sessions: [] });
  }
});

router.post('/:id/audit', idParam, handleValidationErrors, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { command, output, exit_code } = req.body;
    await terminalService.auditCommand(sessionId, req.session.user.id, command, output || '', exit_code || 0);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/kill-all', (req, res) => {
  try {
    const count = terminalService.killAllUserSessions(req.session.user.id);
    try {
      db.run("UPDATE terminal_sessions SET status = 'closed', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'", [req.session.user.id]);
    } catch (e) { /* ignore */ }
    res.json({ success: true, killed: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
