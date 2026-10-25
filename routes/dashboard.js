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
      // Transform dashboard service output to match view expectations
      const summary = {
        websites: dashboardData.stats.summary.websites || 0,
        apps: dashboardData.stats.summary.apps || 0,
        domains: dashboardData.stats.summary.domains || 0,
        databases: dashboardData.stats.summary.databases || 0,
        bots: dashboardData.stats.summary.bots || 0,
        workflows: dashboardData.stats.summary.workflows || 0,
        aiAgents: dashboardData.stats.summary.ai || 0,
        backups: dashboardData.stats.summary.backups || 0,
        storageBuckets: dashboardData.stats.summary.storage || 0,
        emailAccounts: dashboardData.stats.summary.email || 0
      };

      // Card type → icon + color mapping
      const cardMeta = {
        apps: { icon: 'package', color: '#3b82f6', description: 'Deploy and manage your applications' },
        websites: { icon: 'globe', color: '#06b6d4', description: 'Host websites and web applications' },
        databases: { icon: 'database', color: '#10b981', description: 'Managed databases for your projects' },
        storage: { icon: 'folder', color: '#84cc16', description: 'Object storage and file management' },
        bots: { icon: 'bot', color: '#f59e0b', description: 'Telegram, Discord, and WhatsApp bots' },
        ai: { icon: 'brain', color: '#ec4899', description: 'AI agents and model hosting' },
        email: { icon: 'mail', color: '#0ea5e9', description: 'Email accounts and mail services' },
        domains: { icon: 'link', color: '#6366f1', description: 'Domain management and DNS' },
        backups: { icon: 'archive-restore', color: '#ef4444', description: 'Automated backups and restores' },
        workflows: { icon: 'workflow', color: '#8b5cf6', description: 'n8n workflows and automations' }
      };

      // Transform service cards to match view fields
      const serviceCards = dashboardData.cards.filter(card => cardMeta[card.type]).map(card => {
        const meta = cardMeta[card.type] || { icon: 'package', color: '#6b7280', description: '' };
        return {
          serviceType: card.type,
          label: card.title || card.type,
          count: card.count || 0,
          description: meta.description,
          color: meta.color,
          icon: meta.icon,
          stats: card.data || {},
          items: [], // populated by frontend if needed
          createAction: card.canCreate ? { href: card.link || `/${card.type}/create`, label: `New ${card.title || card.type}` } : null,
          href: card.link || `/${card.type}`,
          quickActions: [],
          canCreate: card.canCreate || false,
          canManage: card.canManage || false
        };
      });

      // Extract quick actions from cards
      const quickActions = [];
      dashboardData.cards.forEach(card => {
        if (card.type === 'quick-actions' && card.actions) {
          card.actions.forEach(a => {
            quickActions.push({
              label: a.label,
              href: a.href,
              icon: a.icon || 'plus',
              color: '#3b82f6'
            });
          });
        }
      });

      // Map activity items to view-expected fields
      const recentActivity = (dashboardData.activity || []).map(a => {
        const actionMeta = {
          created: { color: '#10b981', icon: 'plus', message: `${a.user || 'User'} created ${a.resource || 'resource'}` },
          updated: { color: '#3b82f6', icon: 'edit', message: `${a.user || 'User'} updated ${a.resource || 'resource'}` },
          deleted: { color: '#ef4444', icon: 'trash-2', message: `${a.user || 'User'} deleted ${a.resource || 'resource'}` },
          started: { color: '#22c55e', icon: 'play', message: `${a.user || 'User'} started ${a.resource || 'resource'}` },
          stopped: { color: '#f59e0b', icon: 'square', message: `${a.user || 'User'} stopped ${a.resource || 'resource'}` },
          failed: { color: '#ef4444', icon: 'alert-circle', message: `${a.user || 'User'} failed ${a.resource || 'resource'}` }
        };
        const meta = actionMeta[a.action?.toLowerCase()] || { color: '#6b7280', icon: 'activity', message: `${a.user || 'User'} ${a.action || 'activity'} ${a.resource || ''}` };
        return {
          color: meta.color,
          icon: meta.icon,
          message: meta.message,
          user: a.user || 'System',
          time: a.timestamp ? new Date(a.timestamp).toLocaleString() : ''
        };
      });

      const securityCard = dashboardData.cards.find(card => card.type === 'security');

      return res.render('workspaces/dashboard', {
        layout: false,
        title: 'Dashboard',
        pageTitle: 'Dashboard',
        pageSubtitle: `Workspace: ${req.workspace.name}`,
        dashboardData: {
          summary,
          serviceCards,
          resourceUsage: dashboardData.resources,
          security: securityCard ? securityCard.data : null,
          recentActivity,
          quickActions
        },
        activeWorkspace: req.workspace,
        userWorkspaces: req.userWorkspaces,
        workspaceMember: req.workspaceMember || null,
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
