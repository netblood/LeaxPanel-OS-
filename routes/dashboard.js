const express = require('express');
const router = express.Router();
const db = require('../config/db');
const systemService = require('../services/systemService');
const logger = require('../utils/logger');
const dashboardService = require('../services/dashboardService');

router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaceId = req.workspace?.id;

    // Get system stats (these are global, not workspace-specific)
    const cpu = systemService.cpuSnapshot();
    const memory = systemService.memorySnapshot();
    const disk = systemService.diskSnapshot();
    const network = systemService.networkSnapshot();

    const globalStats = {
      cpu,
      memory,
      disk,
      network,
      websites: 0,
      databases: 0,
      bots: 0,
      workflows: 0,
      users: 0,
      apps: 0,
      domains: 0,
      backups: 0,
      activeServices: 0,
      totalServices: 0,
      requests: 0,
      securityEvents: 0,
      aiAgents: 0,
      telegramBots: 0,
      discordBots: 0,
      whatsappInstances: 0,
      aiHosting: 0,
      emailAccounts: 0,
      storageBuckets: 0
    };

    // Get workspace-aware dashboard data
    let dashboardData = null;
    if (workspaceId) {
      dashboardData = await dashboardService.generateDashboard(userId, workspaceId);
      // Merge service stats into globalStats for backward compatibility
      if (dashboardData?.summary) {
        Object.assign(globalStats, dashboardData.summary);
      }
    } else {
      // No workspace - show global counts for owners
      if (req.session.user.role === 'owner') {
        const count = (table, where = '') => {
          try {
            const row = db.get(`SELECT COUNT(*) AS count FROM ${table} ${where}`);
            return row ? row.count : 0;
          } catch (err) { return 0; }
        };

        globalStats.websites = count('websites');
        globalStats.databases = count('databases');
        globalStats.bots = count('bots') + count('discord_bots') + count('telegram_bots') + count('whatsapp_instances');
        globalStats.workflows = count('n8n_workflows');
        globalStats.users = count('users');
        globalStats.apps = count('apps');
        globalStats.domains = count('domains');
        globalStats.backups = count('backups');
        globalStats.activeServices = count('services', "WHERE status = 'active'");
        globalStats.totalServices = count('services');
        globalStats.requests = count('requests');
        globalStats.securityEvents = count('security_events');
        globalStats.aiAgents = count('ai_agents');
        globalStats.telegramBots = count('telegram_bots');
        globalStats.discordBots = count('discord_bots');
        globalStats.whatsappInstances = count('whatsapp_instances');
        globalStats.aiHosting = count('ai_hosting_instances');
        globalStats.emailAccounts = count('email_accounts');
        globalStats.storageBuckets = count('storage_buckets');
      }
    }

    let securityScore = 100;
    try {
      const { computeSecurityScore } = require('../services/securityService');
      const computed = computeSecurityScore();
      if (typeof computed === 'number') securityScore = computed;
    } catch (err) {
      logger.warn('Security score unavailable:', err.message);
    }

    // If we have workspace dashboard data, render the new workspace dashboard
    if (workspaceId && dashboardData) {
      return res.render('workspaces/dashboard', {
        title: 'Dashboard',
        pageTitle: 'Dashboard',
        pageSubtitle: `Workspace: ${req.workspace.name}`,
        dashboard: dashboardData,
        activeWorkspace: req.workspace,
        userWorkspaces: req.userWorkspaces,
        stats: globalStats,
        securityScore,
        currentPath: req.path
      });
    }

    // Fallback to original dashboard for owners without workspace or no workspace context
    const recentLogs = (() => {
      try { return db.all(`SELECT id, action, resource, status_code, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8`); } catch { return []; }
    })();
    const recentBackups = (() => {
      try { return db.all(`SELECT * FROM backups ORDER BY created_at DESC LIMIT 5`); } catch { return []; }
    })();
    const activity = (() => {
      try { return db.all(`SELECT id, user_id, action, resource, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8`); } catch { return []; }
    })();
    const errors = (() => {
      try { return db.all(`SELECT id, event_type, severity, ip_address, created_at FROM security_events ORDER BY created_at DESC LIMIT 6`); } catch { return []; }
    })();
    const growth = {
      websites: (() => { try { return db.all(`SELECT date(created_at) AS day, COUNT(*) AS total FROM websites GROUP BY date(created_at) ORDER BY day DESC LIMIT 7`).reverse(); } catch { return []; } })(),
      users: (() => { try { return db.all(`SELECT date(created_at) AS day, COUNT(*) AS total FROM users GROUP BY date(created_at) ORDER BY day DESC LIMIT 7`).reverse(); } catch { return []; } })(),
      requests: (() => { try { return db.all(`SELECT date(created_at) AS day, COUNT(*) AS total FROM requests GROUP BY date(created_at) ORDER BY day DESC LIMIT 7`).reverse(); } catch { return []; } })()
    };

    const serviceStatuses = {
      webHosting: { status: globalStats.websites > 0 ? 'running' : 'stopped', count: globalStats.websites, healthy: globalStats.websites },
      nodejsHosting: { status: globalStats.apps > 0 ? 'running' : 'stopped', count: globalStats.apps, healthy: globalStats.apps },
      phpHosting: { status: 'stopped', count: 0, healthy: 0 },
      wordpressHosting: { status: 'stopped', count: 0, healthy: 0 },
      woocommerceHosting: { status: 'stopped', count: 0, healthy: 0 },
      telegramHosting: { status: globalStats.telegramBots > 0 ? 'running' : 'stopped', count: globalStats.telegramBots, healthy: globalStats.telegramBots },
      discordHosting: { status: globalStats.discordBots > 0 ? 'running' : 'stopped', count: globalStats.discordBots, healthy: globalStats.discordBots },
      whatsappHosting: { status: globalStats.whatsappInstances > 0 ? 'running' : 'stopped', count: globalStats.whatsappInstances, healthy: globalStats.whatsappInstances },
      n8nHosting: { status: globalStats.workflows > 0 ? 'running' : 'stopped', count: globalStats.workflows, healthy: globalStats.workflows },
      aiHosting: { status: globalStats.aiHosting > 0 ? 'running' : 'stopped', count: globalStats.aiHosting, healthy: globalStats.aiHosting },
      databaseHosting: { status: globalStats.databases > 0 ? 'running' : 'stopped', count: globalStats.databases, healthy: globalStats.databases },
      emailHosting: { status: globalStats.emailAccounts > 0 ? 'running' : 'stopped', count: globalStats.emailAccounts, healthy: globalStats.emailAccounts },
      storageHosting: { status: globalStats.storageBuckets > 0 ? 'running' : 'stopped', count: globalStats.storageBuckets, healthy: globalStats.storageBuckets }
    };

    res.render('dashboard/index', {
      title: 'Dashboard',
      pageTitle: 'Dashboard',
      pageSubtitle: 'Live overview of your cloud platform',
      stats: globalStats,
      recentLogs,
      recentBackups,
      activity,
      errors,
      growth,
      securityScore,
      serviceStatuses
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      pageTitle: '500',
      errorMessage: err.message,
      user: req.session.user
    });
  }
});

module.exports = router;

module.exports = router;
