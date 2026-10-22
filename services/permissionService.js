/**
 * Permission Service
 * Granular permission checking per workspace, service, action, module
 */
const db = require('../config/db');
const logger = require('../utils/logger');
const workspaceService = require('./workspaceService');

class PermissionService {
  /**
   * Check if user has a specific permission in a workspace
   * @param {number} userId - User ID
   * @param {number} workspaceId - Workspace ID
   * @param {string} serviceType - Service type (apps, websites, databases, etc.)
   * @param {string} action - Action (create, read, update, delete, restart, terminal, etc.)
   * @param {string} module - Optional module (deploy, config, scaling, etc.)
   * @returns {boolean}
   */
  async can(userId, workspaceId, serviceType, action, module = null) {
    // Owner always has access
    const workspace = workspaceService.getWorkspace(workspaceId);
    if (workspace && workspace.owner_id === userId) {
      return true;
    }

    // Check workspace membership
    const membership = db.get(`
      SELECT id, role, permissions FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);

    if (!membership) {
      return false;
    }

    // Check explicit permission in workspace_permissions table
    let perm = db.get(`
      SELECT allowed, conditions FROM workspace_permissions 
      WHERE workspace_id = ? AND member_id = ? AND service_type = ? AND action = ? 
        AND (module = ? OR module IS NULL)
      ORDER BY module DESC LIMIT 1
    `, [workspaceId, membership.id, serviceType, action, module]);

    if (perm) {
      if (perm.allowed === 0) return false;
      // Check conditions if any
      if (perm.conditions) {
        const conditions = JSON.parse(perm.conditions);
        if (!this.evaluateConditions(conditions)) {
          return false;
        }
      }
      return true;
    }

    // Check member's custom permissions (JSON array)
    if (membership.permissions) {
      const customPerms = JSON.parse(membership.permissions || '[]');
      const permKey = `${serviceType}:${action}${module ? ':' + module : ''}`;
      const wildcardPerm = `${serviceType}:*`;
      if (customPerms.includes(permKey) || customPerms.includes(wildcardPerm) || customPerms.includes('*')) {
        return true;
      }
    }

    // Check role-based defaults
    return this.checkRolePermission(membership.role, serviceType, action, module);
  }

  /**
   * Check role-based default permissions
   */
  checkRolePermission(role, serviceType, action, module = null) {
    const rolePermissions = {
      owner: ['*'],
      admin: [
        'apps:*', 'websites:*', 'databases:*', 'storage:*', 'bots:*', 'ai:*', 
        'email:*', 'domains:*', 'backups:*', 'monitoring:*', 'filemanager:*', 
        'terminal:*', 'api:*', 'workflows:*'
      ],
      manager: [
        'apps:create', 'apps:read', 'apps:update', 'apps:delete', 'apps:restart', 'apps:terminal', 'apps:filemanager', 'apps:logs', 'apps:deploy',
        'websites:create', 'websites:read', 'websites:update', 'websites:delete', 'websites:ssl', 'websites:dns',
        'databases:create', 'databases:read', 'databases:update', 'databases:delete', 'databases:backup', 'databases:restore',
        'storage:create', 'storage:read', 'storage:update', 'storage:delete',
        'bots:create', 'bots:read', 'bots:update', 'bots:delete', 'bots:restart',
        'ai:create', 'ai:read', 'ai:update', 'ai:delete', 'ai:configure',
        'email:create', 'email:read', 'email:update', 'email:delete',
        'domains:create', 'domains:read', 'domains:update', 'domains:delete', 'domains:ssl', 'domains:dns', 'domains:subdomain',
        'backups:create', 'backups:read', 'backups:delete', 'backups:restore',
        'monitoring:read', 'monitoring:configure',
        'filemanager:read', 'filemanager:upload', 'filemanager:edit', 'filemanager:delete',
        'terminal:access',
        'api:create', 'api:read', 'api:delete',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete', 'workflows:execute'
      ],
      developer: [
        'apps:create', 'apps:read', 'apps:update', 'apps:restart', 'apps:terminal', 'apps:filemanager', 'apps:logs', 'apps:deploy',
        'websites:create', 'websites:read', 'websites:update', 'websites:ssl', 'websites:dns',
        'databases:create', 'databases:read', 'databases:update', 'databases:backup',
        'storage:create', 'storage:read', 'storage:update',
        'bots:create', 'bots:read', 'bots:update', 'bots:restart',
        'ai:create', 'ai:read', 'ai:update', 'ai:configure',
        'email:create', 'email:read', 'email:update',
        'domains:read', 'domains:subdomain',
        'backups:create', 'backups:read',
        'monitoring:read',
        'filemanager:read', 'filemanager:upload', 'filemanager:edit',
        'terminal:access',
        'api:create', 'api:read',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:execute'
      ],
      member: [
        'apps:read', 'apps:logs',
        'websites:read',
        'databases:read',
        'storage:read',
        'bots:read',
        'ai:read',
        'email:read',
        'domains:read',
        'backups:read',
        'monitoring:read',
        'filemanager:read',
        'api:read',
        'workflows:read'
      ],
      viewer: [
        'apps:read',
        'websites:read',
        'databases:read',
        'storage:read',
        'bots:read',
        'ai:read',
        'email:read',
        'domains:read',
        'backups:read',
        'monitoring:read',
        'filemanager:read',
        'api:read',
        'workflows:read'
      ]
    };

    const perms = rolePermissions[role] || [];
    const permKey = `${serviceType}:${action}${module ? ':' + module : ''}`;
    const wildcardKey = `${serviceType}:*`;

    return perms.includes('*') || perms.includes(permKey) || perms.includes(wildcardKey);
  }

  /**
   * Evaluate permission conditions
   */
  evaluateConditions(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Environment condition
    if (conditions.environment) {
      const env = process.env.NODE_ENV || 'development';
      if (conditions.environment !== env && !conditions.environment.includes(env)) {
        return false;
      }
    }

    // Max instances condition
    if (conditions.max_instances) {
      // Would need to check current instance count
      // For now, allow
    }

    // Time-based conditions
    if (conditions.allowed_hours) {
      const hour = new Date().getHours();
      const [start, end] = conditions.allowed_hours.split('-').map(Number);
      if (hour < start || hour >= end) return false;
    }

    // IP allowlist
    if (conditions.allowed_ips && conditions.allowed_ips.length > 0) {
      // Would need request context
    }

    return true;
  }

  /**
   * Get all permissions for a user in a workspace
   */
  async getUserPermissions(userId, workspaceId) {
    const membership = db.get(`
      SELECT id, role, permissions FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);

    if (!membership) return [];

    // Get explicit permissions
    const explicitPerms = db.all(`
      SELECT service_type, action, module, allowed, conditions 
      FROM workspace_permissions 
      WHERE workspace_id = ? AND member_id = ?
    `, [workspaceId, membership.id]);

    // Get role-based permissions
    const rolePerms = this.getRolePermissions(membership.role);

    // Get custom permissions
    const customPerms = JSON.parse(membership.permissions || '[]');

    return {
      role: membership.role,
      explicit: explicitPerms,
      roleBased: rolePerms,
      custom: customPerms
    };
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role) {
    const rolePermissions = {
      owner: ['*'],
      admin: [
        'apps:*', 'websites:*', 'databases:*', 'storage:*', 'bots:*', 'ai:*', 
        'email:*', 'domains:*', 'backups:*', 'monitoring:*', 'filemanager:*', 
        'terminal:*', 'api:*', 'workflows:*'
      ],
      manager: [
        'apps:create', 'apps:read', 'apps:update', 'apps:delete', 'apps:restart', 'apps:terminal', 'apps:filemanager', 'apps:logs', 'apps:deploy', 'apps:scale',
        'websites:create', 'websites:read', 'websites:update', 'websites:delete', 'websites:ssl', 'websites:dns',
        'databases:create', 'databases:read', 'databases:update', 'databases:delete', 'databases:backup', 'databases:restore',
        'storage:create', 'storage:read', 'storage:update', 'storage:delete',
        'bots:create', 'bots:read', 'bots:update', 'bots:delete', 'bots:restart',
        'ai:create', 'ai:read', 'ai:update', 'ai:delete', 'ai:configure',
        'email:create', 'email:read', 'email:update', 'email:delete',
        'domains:create', 'domains:read', 'domains:update', 'domains:delete', 'domains:ssl', 'domains:dns', 'domains:subdomain',
        'backups:create', 'backups:read', 'backups:delete', 'backups:restore',
        'monitoring:read', 'monitoring:configure',
        'filemanager:read', 'filemanager:upload', 'filemanager:edit', 'filemanager:delete',
        'terminal:access',
        'api:create', 'api:read', 'api:delete',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete', 'workflows:execute'
      ],
      developer: [
        'apps:create', 'apps:read', 'apps:update', 'apps:restart', 'apps:terminal', 'apps:filemanager', 'apps:logs', 'apps:deploy',
        'websites:create', 'websites:read', 'websites:update', 'websites:ssl', 'websites:dns',
        'databases:create', 'databases:read', 'databases:update', 'databases:backup',
        'storage:create', 'storage:read', 'storage:update',
        'bots:create', 'bots:read', 'bots:update', 'bots:restart',
        'ai:create', 'ai:read', 'ai:update', 'ai:configure',
        'email:create', 'email:read', 'email:update',
        'domains:read', 'domains:subdomain',
        'backups:create', 'backups:read',
        'monitoring:read',
        'filemanager:read', 'filemanager:upload', 'filemanager:edit',
        'terminal:access',
        'api:create', 'api:read',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:execute'
      ],
      member: [
        'apps:read', 'apps:logs',
        'websites:read',
        'databases:read',
        'storage:read',
        'bots:read',
        'ai:read',
        'email:read',
        'domains:read',
        'backups:read',
        'monitoring:read',
        'filemanager:read',
        'api:read',
        'workflows:read'
      ],
      viewer: [
        'apps:read',
        'websites:read',
        'databases:read',
        'storage:read',
        'bots:read',
        'ai:read',
        'email:read',
        'domains:read',
        'backups:read',
        'monitoring:read',
        'filemanager:read',
        'api:read',
        'workflows:read'
      ]
    };

    return rolePermissions[role] || [];
  }

  /**
   * Check if user can access a specific resource in workspace
   */
  async canAccessResource(userId, workspaceId, resourceType, resourceId) {
    // Check workspace membership
    const membership = db.get(`
      SELECT id FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);

    if (!membership) return false;

    // Check workspace-services assignment
    const assignment = db.get(`
      SELECT id FROM workspace_services 
      WHERE workspace_id = ? AND service_type = ? AND service_id = ? AND status = 'active'
    `, [workspaceId, resourceType, resourceId]);

    if (!assignment) return false;

    // Check read permission
    return this.can(userId, workspaceId, resourceType, 'read');
  }

  /**
   * Get accessible resources for user in workspace
   */
  async getAccessibleResources(userId, workspaceId, resourceType) {
    const canRead = await this.can(userId, workspaceId, resourceType, 'read');
    if (!canRead) return [];

    const assignments = db.all(`
      SELECT ws.service_id, ws.resource_limits, ws.metadata
      FROM workspace_services ws
      WHERE ws.workspace_id = ? AND ws.service_type = ? AND ws.status = 'active'
    `, [workspaceId, resourceType]);

    return assignments.map(a => ({
      id: a.service_id,
      resourceLimits: JSON.parse(a.resource_limits || '{}'),
      metadata: JSON.parse(a.metadata || '{}')
    }));
  }

  /**
   * Filter resources by user permissions
   */
  async filterResources(userId, workspaceId, resources, resourceType) {
    const accessible = await this.getAccessibleResources(userId, workspaceId, resourceType);
    const accessibleIds = new Set(accessible.map(a => a.id));
    return resources.filter(r => accessibleIds.has(r.id));
  }

  /**
   * Middleware factory for permission checking
   */
  createPermissionMiddleware(serviceType, action, module = null) {
    return async (req, res, next) => {
      const userId = req.session?.user?.id;
      const workspaceId = req.session?.activeWorkspaceId || req.params.workspaceId || req.query.workspaceId;

      if (!userId || !workspaceId) {
        return res.status(403).json({ error: 'Authentication required' });
      }

      const hasPermission = await this.can(userId, workspaceId, serviceType, action, module);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `${serviceType}:${action}${module ? ':' + module : ''}`
        });
      }

      req.workspaceId = workspaceId;
      req.workspacePermission = { serviceType, action, module };
      next();
    };
  }

  /**
   * Middleware to require workspace membership
   */
  requireWorkspaceMembership() {
    return async (req, res, next) => {
      const userId = req.session?.user?.id;
      const workspaceId = req.session?.activeWorkspaceId || req.params.workspaceId || req.query.workspaceId;

      if (!userId || !workspaceId) {
        return res.status(403).json({ error: 'Authentication required' });
      }

      const membership = db.get(`
        SELECT id, role, permissions FROM workspace_members 
        WHERE workspace_id = ? AND user_id = ? AND status = 'active'
      `, [workspaceId, userId]);

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      req.workspaceId = workspaceId;
      req.workspaceMembership = membership;
      next();
    };
  }

  /**
   * Check if user is workspace owner
   */
  isWorkspaceOwner(userId, workspaceId) {
    const workspace = workspaceService.getWorkspace(workspaceId);
    return workspace && workspace.owner_id === userId;
  }

  /**
   * Check if user is workspace admin or owner
   */
  isWorkspaceAdmin(userId, workspaceId) {
    const membership = db.get(`
      SELECT role FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);
    return membership && ['owner', 'admin'].includes(membership.role);
  }

  /**
   * Get permission matrix for UI (what user can do on each service)
   */
  async getPermissionMatrix(userId, workspaceId) {
    const services = [
      'apps', 'websites', 'databases', 'storage', 'bots', 'ai', 
      'email', 'domains', 'backups', 'monitoring', 'filemanager', 
      'terminal', 'api', 'workflows', 'ssl', 'dns'
    ];

    const actions = ['create', 'read', 'update', 'delete', 'restart', 'deploy', 'terminal', 'filemanager', 'logs', 'backup', 'restore', 'ssl', 'dns', 'configure', 'scale', 'execute', 'subdomain', 'upload', 'edit', 'access'];

    const matrix = {};

    for (const service of services) {
      matrix[service] = {};
      for (const action of actions) {
        matrix[service][action] = await this.can(userId, workspaceId, service, action);
      }
    }

    return matrix;
  }

  /**
   * Bulk check permissions
   */
  async checkPermissions(userId, workspaceId, checks) {
    const results = {};
    for (const check of checks) {
      const key = `${check.serviceType}:${check.action}${check.module ? ':' + check.module : ''}`;
      results[key] = await this.can(userId, workspaceId, check.serviceType, check.action, check.module);
    }
    return results;
  }
}

module.exports = new PermissionService();