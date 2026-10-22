/**
 * Workspace Service
 * Handles workspace CRUD, switching, resource isolation, and member management
 */
const db = require('../config/db');
const logger = require('../utils/logger');

const WORKSPACE_TYPES = ['personal', 'clients', 'company', 'development', 'production'];
const MEMBER_ROLES = ['owner', 'admin', 'manager', 'developer', 'member', 'viewer'];
const MEMBER_STATUSES = ['active', 'invited', 'suspended'];
const WORKSPACE_STATUSES = ['active', 'archived', 'suspended'];

class WorkspaceService {
  /**
   * Create a new workspace
   */
  async createWorkspace(ownerId, data) {
    const {
      name,
      slug,
      type = 'personal',
      description = '',
      settings = {},
      isDefault = false
    } = data;

    // Validate
    if (!name || !slug) {
      throw new Error('Name and slug are required');
    }

    if (!WORKSPACE_TYPES.includes(type)) {
      throw new Error(`Invalid workspace type. Must be one of: ${WORKSPACE_TYPES.join(', ')}`);
    }

    // Check slug uniqueness
    const existing = db.get('SELECT id FROM workspaces WHERE slug = ?', [slug]);
    if (existing) {
      throw new Error('Workspace slug already exists');
    }

    // If this is default, unset other defaults for this owner
    if (isDefault) {
      db.run('UPDATE workspaces SET is_default = 0 WHERE owner_id = ?', [ownerId]);
    }

    const result = db.run(`
      INSERT INTO workspaces (name, slug, type, description, owner_id, settings, is_default, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `, [name, slug, type, description, ownerId, JSON.stringify(settings), isDefault ? 1 : 0]);

    const workspaceId = result.lastInsertRowid;

    // Add owner as member
    await this.addMember(workspaceId, ownerId, 'owner', { addedBy: ownerId });

    // Create default resource allocations
    await this.initializeDefaultResources(workspaceId);

    // Apply default permissions from templates
    await this.applyPermissionTemplates(workspaceId, ownerId, 'owner');

    // Log activity
    await this.logActivity(workspaceId, ownerId, 'created', 'workspace', workspaceId, { name, slug, type });

    return this.getWorkspace(workspaceId);
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(workspaceId) {
    const workspace = db.get(`
      SELECT w.*, u.name as owner_name, u.email as owner_email
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.id = ?
    `, [workspaceId]);

    if (workspace) {
      workspace.settings = JSON.parse(workspace.settings || '{}');
    }
    return workspace;
  }

  /**
   * Get workspace by slug
   */
  getWorkspaceBySlug(slug) {
    const workspace = db.get(`
      SELECT w.*, u.name as owner_name, u.email as owner_email
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.slug = ?
    `, [slug]);

    if (workspace) {
      workspace.settings = JSON.parse(workspace.settings || '{}');
    }
    return workspace;
  }

  /**
   * List workspaces for a user (where they are a member)
   */
  getUserWorkspaces(userId) {
    const workspaces = db.all(`
      SELECT w.*, wm.role, wm.status as member_status, wm.permissions as member_permissions
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ? AND wm.status = 'active' AND w.status = 'active'
      ORDER BY w.is_default DESC, w.created_at DESC
    `, [userId]);

    return workspaces.map(w => ({
      ...w,
      settings: JSON.parse(w.settings || '{}'),
      member_permissions: JSON.parse(w.member_permissions || '[]')
    }));
  }

  /**
   * List all workspaces owned by a user
   */
  getOwnedWorkspaces(ownerId) {
    const workspaces = db.all(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id AND status = 'active') as member_count
      FROM workspaces w
      WHERE w.owner_id = ?
      ORDER BY w.is_default DESC, w.created_at DESC
    `, [ownerId]);

    return workspaces.map(w => ({
      ...w,
      settings: JSON.parse(w.settings || '{}')
    }));
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId, userId, data) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check permission
    if (!await this.canManageWorkspace(userId, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    const allowedFields = ['name', 'description', 'settings', 'status'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'settings') {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(data[field]);
        }
      }
    }

    if (updates.length === 0) return this.getWorkspace(workspaceId);

    updates.push('updated_at = datetime(\'now\')');
    values.push(workspaceId);

    db.run(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, values);

    await this.logActivity(workspaceId, userId, 'updated', 'workspace', workspaceId, data);

    return this.getWorkspace(workspaceId);
  }

  /**
   * Delete workspace (soft delete - archive)
   */
  async deleteWorkspace(workspaceId, userId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.owner_id !== userId) {
      throw new Error('Only the owner can delete a workspace');
    }

    db.run('UPDATE workspaces SET status = \'archived\', updated_at = datetime(\'now\') WHERE id = ?', [workspaceId]);
    db.run('UPDATE workspace_members SET status = \'suspended\' WHERE workspace_id = ?', [workspaceId]);

    await this.logActivity(workspaceId, userId, 'deleted', 'workspace', workspaceId, {});

    return { success: true };
  }

  /**
   * Switch to workspace (set as active for user session)
   */
  async switchWorkspace(userId, workspaceId) {
    const membership = db.get(`
      SELECT * FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);

    if (!membership) {
      throw new Error('Not a member of this workspace');
    }

    const workspace = this.getWorkspace(workspaceId);
    if (!workspace || workspace.status !== 'active') {
      throw new Error('Workspace not found or inactive');
    }

    // Update user's active workspace in session (handled by middleware)
    await this.logActivity(workspaceId, userId, 'switched', 'workspace', workspaceId, {});

    return {
      workspace,
      membership: {
        role: membership.role,
        permissions: JSON.parse(membership.permissions || '[]')
      }
    };
  }

  /**
   * Get current active workspace for user
   */
  getActiveWorkspace(userId) {
    return db.get(`
      SELECT w.*, wm.role, wm.permissions
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ? AND wm.status = 'active' AND w.status = 'active'
      ORDER BY wm.joined_at DESC
      LIMIT 1
    `, [userId]);
  }

  /**
   * Add member to workspace
   */
  async addMember(workspaceId, userId, role = 'member', options = {}) {
    const { addedBy, permissions = [] } = options;

    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!MEMBER_ROLES.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${MEMBER_ROLES.join(', ')}`);
    }

    // Check if user exists
    const user = db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already a member
    const existing = db.get(`
      SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, userId]);

    if (existing) {
      // Update existing membership
      db.run(`
        UPDATE workspace_members 
        SET role = ?, status = 'active', permissions = ?, updated_at = datetime('now')
        WHERE workspace_id = ? AND user_id = ?
      `, [role, JSON.stringify(permissions), workspaceId, userId]);
    } else {
      // Create new membership
      db.run(`
        INSERT INTO workspace_members (workspace_id, user_id, role, permissions, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [workspaceId, userId, role, JSON.stringify(permissions)]);
    }

    // Apply role-based permission templates
    await this.applyPermissionTemplates(workspaceId, userId, role);

    await this.logActivity(workspaceId, addedBy || userId, 'member_added', 'member', userId, { role });

    return this.getMember(workspaceId, userId);
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId, userId, removedBy) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.owner_id === userId) {
      throw new Error('Cannot remove workspace owner');
    }

    if (!await this.canManageMembers(removedBy, workspaceId)) {
      throw new Error('Insufficient permissions to remove members');
    }

    db.run('UPDATE workspace_members SET status = \'suspended\' WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
    db.run('DELETE FROM workspace_permissions WHERE workspace_id = ? AND member_id IN (SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?)', [workspaceId, workspaceId, userId]);

    await this.logActivity(workspaceId, removedBy, 'member_removed', 'member', userId, {});

    return { success: true };
  }

  /**
   * Update member role
   */
  async updateMemberRole(workspaceId, userId, role, updatedBy) {
    if (!MEMBER_ROLES.includes(role)) {
      throw new Error(`Invalid role`);
    }

    if (!await this.canManageMembers(updatedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    const membership = db.get(`
      SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, userId]);

    if (!membership) {
      throw new Error('Member not found');
    }

    db.run(`
      UPDATE workspace_members SET role = ?, updated_at = datetime('now') WHERE id = ?
    `, [role, membership.id]);

    // Re-apply permission templates for new role
    db.run('DELETE FROM workspace_permissions WHERE workspace_id = ? AND member_id = ?', [workspaceId, membership.id]);
    await this.applyPermissionTemplates(workspaceId, userId, role);

    await this.logActivity(workspaceId, updatedBy, 'updated', 'member', userId, { role });

    return this.getMember(workspaceId, userId);
  }

  /**
   * Get workspace member
   */
  getMember(workspaceId, userId) {
    const member = db.get(`
        SELECT wm.*, u.name, u.email
      FROM workspace_members wm
      LEFT JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND wm.user_id = ?
    `, [workspaceId, userId]);

    if (member) {
      member.permissions = JSON.parse(member.permissions || '[]');
    }
    return member;
  }

  /**
   * List workspace members
   */
  getMembers(workspaceId) {
    const members = db.all(`
        SELECT wm.*, u.name, u.email
      FROM workspace_members wm
      LEFT JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND wm.status = 'active'
      ORDER BY 
        CASE wm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'manager' THEN 3 
          WHEN 'developer' THEN 4 
          WHEN 'member' THEN 5 
          WHEN 'viewer' THEN 6 
        END,
        wm.joined_at ASC
    `, [workspaceId]);

    return members.map(m => ({
      ...m,
      permissions: JSON.parse(m.permissions || '[]')
    }));
  }

  /**
   * Assign service to workspace
   */
  async assignService(workspaceId, serviceType, serviceId, assignedBy, options = {}) {
    const { resourceLimits = {}, metadata = {} } = options;

    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!await this.canManageServices(assignedBy, workspaceId)) {
      throw new Error('Insufficient permissions to assign services');
    }

    // Check resource quota
    await this.checkResourceQuota(workspaceId, serviceType, 1);

    db.run(`
      INSERT OR REPLACE INTO workspace_services 
      (workspace_id, service_type, service_id, assigned_by, resource_limits, metadata, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `, [workspaceId, serviceType, serviceId, assignedBy, JSON.stringify(resourceLimits), JSON.stringify(metadata)]);

    // Increment resource usage
    await this.incrementResourceUsage(workspaceId, serviceType, 1);

    await this.logActivity(workspaceId, assignedBy, 'service_assigned', 'service', serviceId, { serviceType });

    return this.getWorkspaceService(workspaceId, serviceType, serviceId);
  }

  /**
   * Remove service from workspace
   */
  async removeService(workspaceId, serviceType, serviceId, removedBy) {
    if (!await this.canManageServices(removedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    db.run('DELETE FROM workspace_services WHERE workspace_id = ? AND service_type = ? AND service_id = ?', [workspaceId, serviceType, serviceId]);

    // Decrement resource usage
    await this.decrementResourceUsage(workspaceId, serviceType, 1);

    await this.logActivity(workspaceId, removedBy, 'service_removed', 'service', serviceId, { serviceType });

    return { success: true };
  }

  /**
   * Get workspace services
   */
  getWorkspaceServices(workspaceId) {
    return db.all(`
        SELECT ws.*, u.name as assigned_by_name
      FROM workspace_services ws
      LEFT JOIN users u ON ws.assigned_by = u.id
      WHERE ws.workspace_id = ? AND ws.status = 'active'
      ORDER BY ws.assigned_at DESC
    `, [workspaceId]);
  }

  /**
   * Get workspace service
   */
  getWorkspaceService(workspaceId, serviceType, serviceId) {
    return db.get(`
        SELECT ws.*, u.name as assigned_by_name
      FROM workspace_services ws
      LEFT JOIN users u ON ws.assigned_by = u.id
      WHERE ws.workspace_id = ? AND ws.service_type = ? AND ws.service_id = ?
    `, [workspaceId, serviceType, serviceId]);
  }

  /**
   * Assign domain to workspace
   */
  async assignDomain(workspaceId, domainId, assignedBy, permissions = []) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (!await this.canManageDomains(assignedBy, workspaceId)) {
      throw new Error('Insufficient permissions to assign domains');
    }

    await this.checkResourceQuota(workspaceId, 'domains', 1);

    db.run(`
      INSERT OR REPLACE INTO workspace_domains (workspace_id, domain_id, assigned_by, permissions)
      VALUES (?, ?, ?, ?)
    `, [workspaceId, domainId, assignedBy, JSON.stringify(permissions)]);

    await this.incrementResourceUsage(workspaceId, 'domains', 1);

    await this.logActivity(workspaceId, assignedBy, 'domain_assigned', 'domain', domainId, { permissions });

    return this.getWorkspaceDomain(workspaceId, domainId);
  }

  /**
   * Remove domain from workspace
   */
  async removeDomain(workspaceId, domainId, removedBy) {
    if (!await this.canManageDomains(removedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    db.run('DELETE FROM workspace_domains WHERE workspace_id = ? AND domain_id = ?', [workspaceId, domainId]);
    await this.decrementResourceUsage(workspaceId, 'domains', 1);

    await this.logActivity(workspaceId, removedBy, 'domain_removed', 'domain', domainId, {});

    return { success: true };
  }

  /**
   * Get workspace domains
   */
  getWorkspaceDomains(workspaceId) {
    return db.all(`
      SELECT wd.*, d.name as domain_name, d.status as domain_status, u.name as assigned_by_name
      FROM workspace_domains wd
      LEFT JOIN domains d ON wd.domain_id = d.id
      LEFT JOIN users u ON wd.assigned_by = u.id
      WHERE wd.workspace_id = ? AND wd.status = 'active'
    `, [workspaceId]);
  }

  /**
   * Get workspace domain
   */
  getWorkspaceDomain(workspaceId, domainId) {
    return db.get(`
      SELECT wd.*, d.name as domain_name, d.status as domain_status
      FROM workspace_domains wd
      LEFT JOIN domains d ON wd.domain_id = d.id
      WHERE wd.workspace_id = ? AND wd.domain_id = ?
    `, [workspaceId, domainId]);
  }

  /**
   * Initialize default resource allocations for workspace
   */
  async initializeDefaultResources(workspaceId) {
    const defaults = [
      { resource_type: 'cpu', quota: 100, unit: 'cpu_units' },
      { resource_type: 'memory', quota: 4096, unit: 'mb' },
      { resource_type: 'storage', quota: 10240, unit: 'mb' },
      { resource_type: 'bandwidth', quota: 100, unit: 'gb' },
      { resource_type: 'databases', quota: 10, unit: 'count' },
      { resource_type: 'domains', quota: 5, unit: 'count' },
      { resource_type: 'bots', quota: 5, unit: 'count' },
      { resource_type: 'ai_agents', quota: 3, unit: 'count' },
      { resource_type: 'email_accounts', quota: 10, unit: 'count' },
      { resource_type: 'backups', quota: 50, unit: 'count' },
      { resource_type: 'api_keys', quota: 20, unit: 'count' },
      { resource_type: 'workflows', quota: 10, unit: 'count' }
    ];

    for (const resource of defaults) {
      db.run(`
        INSERT OR IGNORE INTO workspace_resources (workspace_id, resource_type, quota, used, unit, period)
        VALUES (?, ?, ?, 0, ?, 'monthly')
      `, [workspaceId, resource.resource_type, resource.quota, resource.unit]);
    }
  }

  /**
   * Get workspace resources
   */
  getWorkspaceResources(workspaceId) {
    return db.all('SELECT * FROM workspace_resources WHERE workspace_id = ?', [workspaceId]);
  }

  /**
   * Update resource quota
   */
  async updateResourceQuota(workspaceId, resourceType, quota, updatedBy) {
    if (!await this.canManageWorkspace(updatedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    db.run(`
      INSERT OR REPLACE INTO workspace_resources (workspace_id, resource_type, quota, used, unit, period, updated_at)
      VALUES (?, ?, ?, COALESCE((SELECT used FROM workspace_resources WHERE workspace_id = ? AND resource_type = ?), 0), 'count', 'monthly', datetime('now'))
    `, [workspaceId, resourceType, quota, workspaceId, resourceType]);

    await this.logActivity(workspaceId, updatedBy, 'updated', 'resource', null, { resourceType, quota });

    return this.getWorkspaceResource(workspaceId, resourceType);
  }

  /**
   * Get workspace resource
   */
  getWorkspaceResource(workspaceId, resourceType) {
    return db.get('SELECT * FROM workspace_resources WHERE workspace_id = ? AND resource_type = ?', [workspaceId, resourceType]);
  }

  /**
   * Check resource quota
   */
  async checkResourceQuota(workspaceId, resourceType, amount = 1) {
    const resource = this.getWorkspaceResource(workspaceId, resourceType);
    if (!resource) return true; // No limit set

    if (resource.quota > 0 && (resource.used + amount) > resource.quota) {
      throw new Error(`Resource quota exceeded for ${resourceType}: ${resource.used + amount}/${resource.quota}`);
    }
    return true;
  }

  /**
   * Increment resource usage
   */
  async incrementResourceUsage(workspaceId, resourceType, amount = 1) {
    db.run(`
      UPDATE workspace_resources SET used = used + ? WHERE workspace_id = ? AND resource_type = ?
    `, [amount, workspaceId, resourceType]);
  }

  /**
   * Decrement resource usage
   */
  async decrementResourceUsage(workspaceId, resourceType, amount = 1) {
    db.run(`
      UPDATE workspace_resources SET used = MAX(0, used - ?) WHERE workspace_id = ? AND resource_type = ?
    `, [amount, workspaceId, resourceType]);
  }

  /**
   * Apply permission templates for a role
   */
  async applyPermissionTemplates(workspaceId, userId, role) {
    const membership = db.get('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
    if (!membership) return;

    const templates = db.all(`
      SELECT * FROM workspace_permission_templates WHERE name = ?
    `, [role]);

    for (const tmpl of templates) {
      db.run(`
        INSERT OR REPLACE INTO workspace_permissions (workspace_id, member_id, service_type, action, module, allowed, conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [workspaceId, membership.id, tmpl.service_type, tmpl.action, tmpl.module, tmpl.allowed ? 1 : 0, tmpl.conditions]);
    }
  }

  /**
   * Check if user has permission in workspace
   */
  async hasPermission(userId, workspaceId, serviceType, action, module = null) {
    const membership = db.get(`
      SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'
    `, [workspaceId, userId]);

    if (!membership) return false;

    // Check explicit permission
    let perm = db.get(`
      SELECT allowed FROM workspace_permissions 
      WHERE workspace_id = ? AND member_id = ? AND service_type = ? AND action = ? AND (module = ? OR module IS NULL)
      ORDER BY module DESC LIMIT 1
    `, [workspaceId, membership.id, serviceType, action, module]);

    if (perm) return perm.allowed === 1;

    // Check member's custom permissions
    const member = this.getMember(workspaceId, userId);
    if (member && member.permissions) {
      const customPerm = `${serviceType}:${action}${module ? ':' + module : ''}`;
      if (member.permissions.includes(customPerm) || member.permissions.includes('*')) {
        return true;
      }
    }

    // Check role-based default (owner has all)
    if (member && member.role === 'owner') return true;

    return false;
  }

  /**
   * Grant permission to member
   */
  async grantPermission(workspaceId, memberId, serviceType, action, module, grantedBy, conditions = {}) {
    if (!await this.canManagePermissions(grantedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    db.run(`
      INSERT OR REPLACE INTO workspace_permissions (workspace_id, member_id, service_type, action, module, allowed, conditions)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `, [workspaceId, memberId, serviceType, action, module, JSON.stringify(conditions)]);

    await this.logActivity(workspaceId, grantedBy, 'permission_granted', 'permission', null, { memberId, serviceType, action, module });

    return { success: true };
  }

  /**
   * Revoke permission from member
   */
  async revokePermission(workspaceId, memberId, serviceType, action, module, revokedBy) {
    if (!await this.canManagePermissions(revokedBy, workspaceId)) {
      throw new Error('Insufficient permissions');
    }

    db.run(`
      DELETE FROM workspace_permissions WHERE workspace_id = ? AND member_id = ? AND service_type = ? AND action = ? AND (module = ? OR module IS NULL)
    `, [workspaceId, memberId, serviceType, action, module]);

    await this.logActivity(workspaceId, revokedBy, 'permission_revoked', 'permission', null, { memberId, serviceType, action, module });

    return { success: true };
  }

  /**
   * Get member permissions
   */
  getMemberPermissions(workspaceId, memberId) {
    return db.all(`
      SELECT * FROM workspace_permissions WHERE workspace_id = ? AND member_id = ?
    `, [workspaceId, memberId]);
  }

  /**
   * Log workspace activity
   */
  async logActivity(workspaceId, userId, action, resourceType, resourceId, details = {}) {
    db.run(`
      INSERT INTO workspace_activity (workspace_id, user_id, action, resource_type, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [workspaceId, userId, action, resourceType, resourceId, JSON.stringify(details)]);
  }

  /**
   * Get workspace activity
   */
  getActivity(workspaceId, limit = 50) {
    return db.all(`
      SELECT wa.*, u.name
      FROM workspace_activity wa
      LEFT JOIN users u ON wa.user_id = u.id
      WHERE wa.workspace_id = ?
      ORDER BY wa.created_at DESC
      LIMIT ?
    `, [workspaceId, limit]);
  }

  /**
   * Check if user can manage workspace (owner/admin)
   */
  async canManageWorkspace(userId, workspaceId) {
    const member = this.getMember(workspaceId, userId);
    return member && ['owner', 'admin'].includes(member.role);
  }

  /**
   * Check if user can manage members
   */
  async canManageMembers(userId, workspaceId) {
    const member = this.getMember(workspaceId, userId);
    return member && ['owner', 'admin'].includes(member.role);
  }

  /**
   * Check if user can manage services
   */
  async canManageServices(userId, workspaceId) {
    return this.hasPermission(userId, workspaceId, 'services', 'create');
  }

  /**
   * Check if user can manage domains
   */
  async canManageDomains(userId, workspaceId) {
    return this.hasPermission(userId, workspaceId, 'domains', 'create');
  }

  /**
   * Check if user can manage permissions
   */
  async canManagePermissions(userId, workspaceId) {
    const member = this.getMember(workspaceId, userId);
    return member && ['owner', 'admin'].includes(member.role);
  }

  /**
   * Get workspace stats
   */
  getWorkspaceStats(workspaceId) {
    const services = this.getWorkspaceServices(workspaceId);
    const domains = this.getWorkspaceDomains(workspaceId);
    const resources = this.getWorkspaceResources(workspaceId);
    const members = this.getMembers(workspaceId);

    // Count services by type
    const serviceCounts = {};
    for (const svc of services) {
      serviceCounts[svc.service_type] = (serviceCounts[svc.service_type] || 0) + 1;
    }

    return {
      services: serviceCounts,
      totalServices: services.length,
      domains: domains.length,
      members: members.length,
      resources,
      resourceUsage: resources.map(r => ({
        type: r.resource_type,
        used: r.used,
        quota: r.quota,
        percent: r.quota > 0 ? Math.round((r.used / r.quota) * 100) : 0
      }))
    };
  }

  /**
   * Create default workspaces for new owner
   */
  async createDefaultWorkspaces(ownerId) {
    const workspaces = [
      { name: 'Personal', slug: 'personal', type: 'personal', description: 'Your personal workspace', isDefault: true },
      { name: 'Clients', slug: 'clients', type: 'clients', description: 'Client workspaces', isDefault: false },
      { name: 'Company', slug: 'company', type: 'company', description: 'Company internal workspace', isDefault: false },
      { name: 'Development', slug: 'development', type: 'development', description: 'Development and staging environment', isDefault: false },
      { name: 'Production', slug: 'production', type: 'production', description: 'Production environment', isDefault: false }
    ];

    const created = [];
    for (const ws of workspaces) {
      try {
        const createdWs = await this.createWorkspace(ownerId, ws);
        created.push(createdWs);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          logger.error(`Failed to create default workspace ${ws.slug}:`, err);
        }
      }
    }

    return created;
  }
}

module.exports = new WorkspaceService();