/**
 * Dashboard Service
 * Dynamically generates dashboard based on user's workspace assignments and permissions
 */
const db = require('../config/db');
const logger = require('../utils/logger');
const workspaceService = require('./workspaceService');
const permissionService = require('./permissionService');
const systemService = require('./systemService');

class DashboardService {
  /**
   * Generate dynamic dashboard for a user in a workspace
   */
  async generateDashboard(userId, workspaceId) {
    const workspace = workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check membership
    const membership = workspaceService.getMember(workspaceId, userId);
    if (!membership) {
      throw new Error('Not a member of this workspace');
    }

    // Get permission matrix
    const permissions = await permissionService.getPermissionMatrix(userId, workspaceId);

    // Get accessible services
    const services = await this.getAccessibleServices(userId, workspaceId, permissions);

    // Get stats for accessible services
    const stats = await this.getServiceStats(userId, workspaceId, permissions);

    // Get recent activity
    const activity = await this.getRecentActivity(userId, workspaceId, permissions);

    // Get resource usage
    const resources = workspaceService.getWorkspaceResources(workspaceId);

    // Build dashboard cards based on permissions
        const cards = this.buildDashboardCards(services, stats, permissions, membership.role, workspaceId);

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.type,
        settings: workspace.settings
      },
      membership: {
        role: membership.role,
        permissions: membership.permissions
      },
      permissions,
      stats,
      cards,
      activity,
      resources: resources.map(r => ({
        type: r.resource_type,
        used: r.used,
        quota: r.quota,
        unit: r.unit,
        percent: r.quota > 0 ? Math.round((r.used / r.quota) * 100) : 0
      })),
      system: this.getSystemStats()
    };
  }

  /**
   * Get accessible services based on permissions
   */
  async getAccessibleServices(userId, workspaceId, permissions) {
    const services = workspaceService.getWorkspaceServices(workspaceId);
    const accessible = [];

    for (const svc of services) {
      if (permissions[svc.service_type]?.read) {
        accessible.push(svc);
      }
    }

    // Group by service type
    const grouped = {};
    for (const svc of accessible) {
      if (!grouped[svc.service_type]) {
        grouped[svc.service_type] = [];
      }
      grouped[svc.service_type].push(svc);
    }

    return grouped;
  }

  /**
   * Get stats for accessible services
   */
  async getServiceStats(userId, workspaceId, permissions) {
    const stats = {};
    const workspaceServices = workspaceService.getWorkspaceServices(workspaceId);

    // Count services by type that user can read
    for (const svc of workspaceServices) {
      if (permissions[svc.service_type]?.read) {
        stats[svc.service_type] = (stats[svc.service_type] || 0) + 1;
      }
    }

    // Get detailed stats for each service type
    const detailedStats = {};

    if (permissions.apps?.read) {
      const apps = workspaceServices.filter(s => s.service_type === 'apps');
      const appIds = apps.map(a => a.service_id);
      if (appIds.length > 0) {
        const placeholders = appIds.map(() => '?').join(',');
        const running = db.get(`SELECT COUNT(*) as count FROM apps WHERE id IN (${placeholders}) AND status = 'running'`, appIds);
        const total = db.get(`SELECT COUNT(*) as count FROM apps WHERE id IN (${placeholders})`, appIds);
        detailedStats.apps = { total: total.count, running: running.count };
      }
    }

    if (permissions.websites?.read) {
      const websites = workspaceServices.filter(s => s.service_type === 'websites');
      const siteIds = websites.map(w => w.service_id);
      if (siteIds.length > 0) {
        const placeholders = siteIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM websites WHERE id IN (${placeholders}) AND status = 'active'`, siteIds);
        const total = db.get(`SELECT COUNT(*) as count FROM websites WHERE id IN (${placeholders})`, siteIds);
        detailedStats.websites = { total: total.count, active: active.count };
      }
    }

    if (permissions.databases?.read) {
      const dbs = workspaceServices.filter(s => s.service_type === 'databases');
      const dbIds = dbs.map(d => d.service_id);
      if (dbIds.length > 0) {
        const placeholders = dbIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM databases WHERE id IN (${placeholders}) AND status = 'active'`, dbIds);
        const total = db.get(`SELECT COUNT(*) as count FROM databases WHERE id IN (${placeholders})`, dbIds);
        detailedStats.databases = { total: total.count, active: active.count };
      }
    }

    if (permissions.bots?.read) {
      const bots = workspaceServices.filter(s => s.service_type === 'bots');
      const botIds = bots.map(b => b.service_id);
      if (botIds.length > 0) {
        const placeholders = botIds.map(() => '?').join(',');
        const running = db.get(`SELECT COUNT(*) as count FROM bots WHERE id IN (${placeholders}) AND status = 'running'`, botIds);
        const total = db.get(`SELECT COUNT(*) as count FROM bots WHERE id IN (${placeholders})`, botIds);
        detailedStats.bots = { total: total.count, running: running.count };
      }
    }

    if (permissions.ai?.read) {
      const ais = workspaceServices.filter(s => s.service_type === 'ai');
      const aiIds = ais.map(a => a.service_id);
      if (aiIds.length > 0) {
        const placeholders = aiIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM ai_agents WHERE id IN (${placeholders}) AND status = 'active'`, aiIds);
        const total = db.get(`SELECT COUNT(*) as count FROM ai_agents WHERE id IN (${placeholders})`, aiIds);
        detailedStats.ai = { total: total.count, active: active.count };
      }
    }

    if (permissions.email?.read) {
      const emails = workspaceServices.filter(s => s.service_type === 'email');
      const emailIds = emails.map(e => e.service_id);
      if (emailIds.length > 0) {
        const placeholders = emailIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM email_accounts WHERE id IN (${placeholders}) AND status = 'active'`, emailIds);
        const total = db.get(`SELECT COUNT(*) as count FROM email_accounts WHERE id IN (${placeholders})`, emailIds);
        detailedStats.email = { total: total.count, active: active.count };
      }
    }

    if (permissions.domains?.read) {
      const domains = workspaceService.getWorkspaceDomains(workspaceId);
      detailedStats.domains = { total: domains.length, active: domains.filter(d => d.domain_status === 'active').length };
    }

    if (permissions.storage?.read) {
      const storage = workspaceServices.filter(s => s.service_type === 'storage');
      const storageIds = storage.map(s => s.service_id);
      if (storageIds.length > 0) {
        const placeholders = storageIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM storage_buckets WHERE id IN (${placeholders}) AND status = 'active'`, storageIds);
        const total = db.get(`SELECT COUNT(*) as count FROM storage_buckets WHERE id IN (${placeholders})`, storageIds);
        detailedStats.storage = { total: total.count, active: active.count };
      }
    }

    if (permissions.backups?.read) {
          const backupCount = db.get(`SELECT COUNT(*) as count FROM backups WHERE user_id = ?`, [userId]);
      detailedStats.backups = { total: backupCount.count };
    }

    if (permissions.workflows?.read) {
      const workflows = workspaceServices.filter(s => s.service_type === 'workflows');
      const wfIds = workflows.map(w => w.service_id);
      if (wfIds.length > 0) {
        const placeholders = wfIds.map(() => '?').join(',');
        const active = db.get(`SELECT COUNT(*) as count FROM n8n_workflows WHERE id IN (${placeholders}) AND status = 'active'`, wfIds);
        const total = db.get(`SELECT COUNT(*) as count FROM n8n_workflows WHERE id IN (${placeholders})`, wfIds);
        detailedStats.workflows = { total: total.count, active: active.count };
      }
    }

    return { summary: stats, detailed: detailedStats };
  }

  /**
   * Get recent activity for accessible services
   */
  async getRecentActivity(userId, workspaceId, permissions, limit = 20) {
    const activities = [];

    // Workspace activity
    const wsActivity = workspaceService.getActivity(workspaceId, 10);
    activities.push(...wsActivity.map(a => ({
      type: 'workspace',
      action: a.action,
      resource: a.resource_type,
      details: JSON.parse(a.details || '{}'),
          user: a.name,
      timestamp: a.created_at
    })));

    // Service-specific activities (audit logs)
    const workspaceServices = workspaceService.getWorkspaceServices(workspaceId);
    const serviceTypes = [...new Set(workspaceServices.map(s => s.service_type))];

    for (const svcType of serviceTypes) {
      if (!permissions[svcType]?.read) continue;

      const services = workspaceServices.filter(s => s.service_type === svcType);
      const serviceIds = services.map(s => s.service_id);
      if (serviceIds.length === 0) continue;

      const placeholders = serviceIds.map(() => '?').join(',');
      
      // Get audit logs for these services
      try {
        const auditLogs = db.all(`
          SELECT * FROM audit_logs 
          WHERE resource = ? AND resource_id IN (${placeholders})
          ORDER BY created_at DESC LIMIT 5
        `, [svcType, ...serviceIds]);

        activities.push(...auditLogs.map(log => ({
          type: 'service',
          serviceType: svcType,
          action: log.action,
          resource: log.resource,
          resourceId: log.resource_id,
          details: JSON.parse(log.details || '{}'),
          status: log.status_code,
          timestamp: log.created_at
        })));
      } catch (err) {
        logger.debug(`Could not fetch audit logs for ${svcType}:`, err.message);
      }
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Build dashboard cards based on accessible services and permissions
   */
    buildDashboardCards(services, stats, permissions, role, workspaceId) {
    const cards = [];

    // System Overview Card (always visible)
    cards.push({
      type: 'system-overview',
      title: 'System Overview',
      icon: 'server',
      priority: 100,
      data: stats.summary
    });

    // Resource Usage Card (if user can read resources)
    if (permissions.storage?.read || permissions.databases?.read || role === 'owner' || role === 'admin') {
      cards.push({
        type: 'resource-usage',
        title: 'Resource Usage',
        icon: 'harddrive',
        priority: 90,
        data: stats.detailed
      });
    }

    // Service Cards - only show if user has read permission
    const serviceCards = [
      { type: 'apps', key: 'apps', title: 'Applications', icon: 'box', perm: 'apps' },
      { type: 'websites', key: 'websites', title: 'Websites', icon: 'layout', perm: 'websites' },
      { type: 'databases', key: 'databases', title: 'Databases', icon: 'database', perm: 'databases' },
      { type: 'storage', key: 'storage', title: 'Storage', icon: 'harddrive', perm: 'storage' },
      { type: 'bots', key: 'bots', title: 'Bots', icon: 'bot', perm: 'bots' },
      { type: 'ai', key: 'ai', title: 'AI Agents', icon: 'sparkles', perm: 'ai' },
      { type: 'email', key: 'email', title: 'Email', icon: 'mail', perm: 'email' },
      { type: 'domains', key: 'domains', title: 'Domains', icon: 'globe', perm: 'domains' },
      { type: 'backups', key: 'backups', title: 'Backups', icon: 'archive', perm: 'backups' },
      { type: 'workflows', key: 'workflows', title: 'Workflows', icon: 'git-branch', perm: 'workflows' }
    ];

    for (const svc of serviceCards) {
      if (permissions[svc.perm]?.read) {
        const count = stats.summary[svc.perm] || 0;
        const detailed = stats.detailed[svc.perm] || {};
        
        cards.push({
          type: svc.type,
          title: svc.title,
          icon: svc.icon,
          priority: 80 - serviceCards.indexOf(svc),
          count,
          data: detailed,
          canCreate: permissions[svc.perm]?.create || false,
          canManage: permissions[svc.perm]?.update || false,
          link: `/${svc.perm}`
        });
      }
    }

    // Quick Actions Card (based on create permissions)
    const quickActions = [];
    if (permissions.apps?.create) quickActions.push({ label: 'New Application', href: '/apps/create', icon: 'plus', service: 'apps' });
    if (permissions.websites?.create) quickActions.push({ label: 'New Website', href: '/website/create', icon: 'plus', service: 'websites' });
    if (permissions.databases?.create) quickActions.push({ label: 'New Database', href: '/databases/create', icon: 'plus', service: 'databases' });
    if (permissions.bots?.create) quickActions.push({ label: 'New Bot', href: '/bots/create', icon: 'plus', service: 'bots' });
    if (permissions.ai?.create) quickActions.push({ label: 'New AI Agent', href: '/ai/create', icon: 'plus', service: 'ai' });
    if (permissions.email?.create) quickActions.push({ label: 'New Email', href: '/email/create', icon: 'plus', service: 'email' });
    if (permissions.domains?.create) quickActions.push({ label: 'Add Domain', href: '/domains/create', icon: 'plus', service: 'domains' });
    if (permissions.workflows?.create) quickActions.push({ label: 'New Workflow', href: '/n8n/create', icon: 'plus', service: 'workflows' });

    if (quickActions.length > 0) {
      cards.push({
        type: 'quick-actions',
        title: 'Quick Actions',
        icon: 'zap',
        priority: 50,
        actions: quickActions
      });
    }

    // Member Management Card (for admins/owners)
        if (role === 'owner' || role === 'admin') {
          const members = workspaceService.getMembers(workspaceId);
          cards.push({
            type: 'members',
            title: 'Team Members',
            icon: 'users',
            priority: 40,
            count: members.length,
            members: members.slice(0, 5).map(m => ({
              id: m.user_id,
              name: m.name,
              email: m.email,
              role: m.role,
              avatar: null
            })),
            canManage: true,
            link: '/workspaces/members'
          });
        }

    // Security/Monitoring Card
    if (permissions.monitoring?.read || permissions.security?.view) {
      cards.push({
        type: 'security',
        title: 'Security & Monitoring',
        icon: 'shield',
        priority: 30,
        data: {
          securityScore: this.getSecurityScore(),
          recentEvents: this.getRecentSecurityEvents()
        }
      });
    }

    return cards.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get system stats
   */
  getSystemStats() {
    try {
      return {
        cpu: systemService.cpuSnapshot(),
        memory: systemService.memorySnapshot(),
        disk: systemService.diskSnapshot(),
        network: systemService.networkSnapshot()
      };
    } catch (err) {
      return {};
    }
  }

  /**
   * Get security score
   */
  getSecurityScore() {
    try {
      const { computeSecurityScore } = require('./securityService');
      return computeSecurityScore();
    } catch (err) {
      return 100;
    }
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(limit = 5) {
    try {
      return db.all(`
        SELECT * FROM security_events 
        ORDER BY created_at DESC LIMIT ?
      `, [limit]);
    } catch (err) {
      return [];
    }
  }

  /**
   * Get user's default dashboard (first accessible workspace)
   */
  async getDefaultDashboard(userId) {
    const workspaces = workspaceService.getUserWorkspaces(userId);
    if (workspaces.length === 0) {
      return null;
    }

    // Use default workspace or first active one
    const defaultWs = workspaces.find(w => w.is_default) || workspaces[0];
    return this.generateDashboard(userId, defaultWs.id);
  }

  /**
   * Get dashboard summary for sidebar/widgets
   */
  async getDashboardSummary(userId, workspaceId) {
    const dashboard = await this.generateDashboard(userId, workspaceId);
    
    return {
      workspace: dashboard.workspace,
      stats: dashboard.stats.summary,
      cards: dashboard.cards.filter(c => c.type !== 'quick-actions' && c.type !== 'members').slice(0, 8),
      quickActions: dashboard.cards.find(c => c.type === 'quick-actions')?.actions || [],
      system: dashboard.system
    };
  }

  /**
   * Get service-specific dashboard data
   */
  async getServiceDashboard(userId, workspaceId, serviceType) {
    const permissions = await permissionService.getPermissionMatrix(userId, workspaceId);
    
    if (!permissions[serviceType]?.read) {
      throw new Error('No access to this service');
    }

    const services = workspaceService.getWorkspaceServices(workspaceId)
      .filter(s => s.service_type === serviceType);

    const serviceIds = services.map(s => s.service_id);
    if (serviceIds.length === 0) {
      return { services: [], stats: {}, canCreate: permissions[serviceType]?.create };
    }

    const placeholders = serviceIds.map(() => '?').join(',');
    let items = [];
    let stats = {};

    // Fetch service-specific data
    switch (serviceType) {
      case 'apps':
        items = db.all(`SELECT * FROM apps WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          running: items.filter(i => i.status === 'running').length,
          stopped: items.filter(i => i.status === 'stopped').length,
          error: items.filter(i => i.status === 'error').length
        };
        break;
      case 'websites':
        items = db.all(`SELECT * FROM websites WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length,
          inactive: items.filter(i => i.status !== 'active').length
        };
        break;
      case 'databases':
        items = db.all(`SELECT * FROM databases WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length
        };
        break;
      case 'bots':
        items = db.all(`SELECT * FROM bots WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          running: items.filter(i => i.status === 'running').length,
          stopped: items.filter(i => i.status === 'stopped').length
        };
        break;
      case 'ai':
        items = db.all(`SELECT * FROM ai_agents WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length
        };
        break;
      case 'email':
        items = db.all(`SELECT * FROM email_accounts WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length
        };
        break;
      case 'storage':
        items = db.all(`SELECT * FROM storage_buckets WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length
        };
        break;
      case 'workflows':
        items = db.all(`SELECT * FROM n8n_workflows WHERE id IN (${placeholders}) ORDER BY created_at DESC`, serviceIds);
        stats = {
          total: items.length,
          active: items.filter(i => i.status === 'active').length
        };
        break;
    }

    return {
      services: items,
      stats,
      canCreate: permissions[serviceType]?.create,
      canManage: permissions[serviceType]?.update,
      serviceType
    };
  }
}

module.exports = new DashboardService();