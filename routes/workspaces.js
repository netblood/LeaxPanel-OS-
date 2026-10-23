/**
 * Workspace Routes
 * Handles workspace CRUD, switching, members, services, domains, resources, permissions
 */
const express = require('express');
const router = express.Router();
const workspaceService = require('../services/workspaceService');
const permissionService = require('../services/permissionService');
const dashboardService = require('../services/dashboardService');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { body, query } = require('express-validator');

// Middleware to require workspace membership
const requireWorkspace = permissionService.requireWorkspaceMembership();

// All routes require authentication
router.use((req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

/**
 * GET /workspaces - List user's workspaces
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaces = workspaceService.getUserWorkspaces(userId);
    res.json({ workspaces });
  } catch (err) {
    console.error('List workspaces error:', err);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

/**
 * GET /workspaces/owned - List workspaces owned by user
 */
router.get('/owned', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaces = workspaceService.getOwnedWorkspaces(userId);
    res.json({ workspaces });
  } catch (err) {
    console.error('List owned workspaces error:', err);
    res.status(500).json({ error: 'Failed to list owned workspaces' });
  }
});

/**
 * POST /workspaces - Create new workspace
 */
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('slug').trim().notEmpty().withMessage('Slug is required').isAlphanumeric().withMessage('Slug must be alphanumeric'),
  body('type').optional().isIn(['personal', 'clients', 'company', 'development', 'production']),
  body('description').optional().isString(),
  body('settings').optional().isObject(),
  body('isDefault').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspace = await workspaceService.createWorkspace(userId, req.body);
    res.status(201).json({ workspace });
  } catch (err) {
    console.error('Create workspace error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /dashboard - Get dynamic dashboard for current workspace
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaceId = req.session.activeWorkspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      // Get default dashboard
      const dashboard = await dashboardService.getDefaultDashboard(userId);
      return res.json({ dashboard });
    }

    const dashboard = await dashboardService.generateDashboard(userId, workspaceId);
    res.json({ dashboard });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /dashboard/summary - Get dashboard summary for sidebar/widgets
 */
router.get('/dashboard/summary', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaceId = req.session.activeWorkspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      const dashboard = await dashboardService.getDefaultDashboard(userId);
      if (!dashboard) {
        return res.json({ summary: null });
      }
      workspaceId = dashboard.workspace.id;
    }

    const summary = await dashboardService.getDashboardSummary(userId, workspaceId);
    res.json({ summary });
  } catch (err) {
    console.error('Get dashboard summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /dashboard/service/:serviceType - Get service-specific dashboard
 */
router.get('/dashboard/service/:serviceType', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaceId = req.session.activeWorkspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'No active workspace' });
    }

    const dashboard = await dashboardService.getServiceDashboard(userId, workspaceId, req.params.serviceType);
    res.json({ dashboard });
  } catch (err) {
    if (err.message === 'No access to this service') {
      return res.status(403).json({ error: err.message });
    }
    console.error('Get service dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id - Get workspace details
 */
router.get('/:id', idParam, handleValidationErrors, async (req, res) => {
  try {
    const workspace = workspaceService.getWorkspace(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check membership
    const membership = workspaceService.getMember(req.params.id, req.session.user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    res.json({ workspace, membership });
  } catch (err) {
    console.error('Get workspace error:', err);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

/**
 * PUT /workspaces/:id - Update workspace
 */
router.put('/:id', [
  idParam,
  body('name').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('settings').optional().isObject(),
  body('status').optional().isIn(['active', 'archived', 'suspended']),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspace = await workspaceService.updateWorkspace(req.params.id, userId, req.body);
    res.json({ workspace });
  } catch (err) {
    console.error('Update workspace error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /workspaces/:id - Delete (archive) workspace
 */
router.delete('/:id', idParam, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await workspaceService.deleteWorkspace(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete workspace error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /workspaces/:id/switch - Switch to workspace
 */
router.post('/:id/switch', idParam, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await workspaceService.switchWorkspace(userId, req.params.id);

    // Update session (IDs are integers in the DB; req.params.id is a string)
    const workspaceId = parseInt(req.params.id, 10);
    req.session.activeWorkspaceId = Number.isInteger(workspaceId) ? workspaceId : req.params.id;
    req.session.activeWorkspace = result.workspace;
    req.session.workspaceMembership = result.membership;
    
    await new Promise((resolve, reject) => {
      req.session.save(err => err ? reject(err) : resolve());
    });

    res.json({ 
      success: true,
      workspace: result.workspace, 
      membership: result.membership,
      message: `Switched to ${result.workspace.name}`
    });
  } catch (err) {
    console.error('Switch workspace error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/stats - Get workspace stats
 */
router.get('/:id/stats', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const stats = workspaceService.getWorkspaceStats(req.params.id);
    res.json({ stats });
  } catch (err) {
    console.error('Get workspace stats error:', err);
    res.status(500).json({ error: 'Failed to get workspace stats' });
  }
});

/**
 * GET /workspaces/:id/activity - Get workspace activity
 */
router.get('/:id/activity', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activity = workspaceService.getActivity(req.params.id, limit);
    res.json({ activity });
  } catch (err) {
    console.error('Get workspace activity error:', err);
    res.status(500).json({ error: 'Failed to get workspace activity' });
  }
});

/**
 * GET /workspaces/:id/members - List workspace members
 */
router.get('/:id/members', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const members = workspaceService.getMembers(req.params.id);
    res.json({ members });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

/**
 * POST /workspaces/:id/members - Add member to workspace
 */
router.post('/:id/members', [
  idParam,
  body('userId').isInt().withMessage('Valid user ID required'),
  body('role').optional().isIn(['owner', 'admin', 'manager', 'developer', 'member', 'viewer']),
  body('permissions').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { userId: targetUserId, role = 'member', permissions = [] } = req.body;
    
    const member = await workspaceService.addMember(req.params.id, targetUserId, role, { 
      addedBy: userId, 
      permissions 
    });
    
    res.status(201).json({ member });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /workspaces/:id/members/:userId - Update member role
 */
router.put('/:id/members/:userId', [
  idParam,
  body('role').isIn(['owner', 'admin', 'manager', 'developer', 'member', 'viewer']).withMessage('Invalid role'),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const member = await workspaceService.updateMemberRole(req.params.id, req.params.userId, req.body.role, userId);
    res.json({ member });
  } catch (err) {
    console.error('Update member error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /workspaces/:id/members/:userId - Remove member from workspace
 */
router.delete('/:id/members/:userId', idParam, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await workspaceService.removeMember(req.params.id, req.params.userId, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/services - List workspace services
 */
router.get('/:id/services', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const services = workspaceService.getWorkspaceServices(req.params.id);
    res.json({ services });
  } catch (err) {
    console.error('List workspace services error:', err);
    res.status(500).json({ error: 'Failed to list services' });
  }
});

/**
 * POST /workspaces/:id/services - Assign service to workspace
 */
router.post('/:id/services', [
  idParam,
  body('serviceType').trim().notEmpty().withMessage('Service type required'),
  body('serviceId').isInt().withMessage('Valid service ID required'),
  body('resourceLimits').optional().isObject(),
  body('metadata').optional().isObject(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { serviceType, serviceId, resourceLimits = {}, metadata = {} } = req.body;
    
    const service = await workspaceService.assignService(req.params.id, serviceType, serviceId, userId, { resourceLimits, metadata });
    res.status(201).json({ service });
  } catch (err) {
    console.error('Assign service error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /workspaces/:id/services/:serviceType/:serviceId - Remove service from workspace
 */
router.delete('/:id/services/:serviceType/:serviceId', [
  idParam,
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    await workspaceService.removeService(req.params.id, req.params.serviceType, req.params.serviceId, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove service error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/domains - List workspace domains
 */
router.get('/:id/domains', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const domains = workspaceService.getWorkspaceDomains(req.params.id);
    res.json({ domains });
  } catch (err) {
    console.error('List workspace domains error:', err);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

/**
 * POST /workspaces/:id/domains - Assign domain to workspace
 */
router.post('/:id/domains', [
  idParam,
  body('domainId').isInt().withMessage('Valid domain ID required'),
  body('permissions').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { domainId, permissions = [] } = req.body;
    
    const domain = await workspaceService.assignDomain(req.params.id, domainId, userId, permissions);
    res.status(201).json({ domain });
  } catch (err) {
    console.error('Assign domain error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /workspaces/:id/domains/:domainId - Remove domain from workspace
 */
router.delete('/:id/domains/:domainId', [
  idParam,
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    await workspaceService.removeDomain(req.params.id, req.params.domainId, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove domain error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/resources - Get workspace resources
 */
router.get('/:id/resources', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const resources = workspaceService.getWorkspaceResources(req.params.id);
    res.json({ resources });
  } catch (err) {
    console.error('Get workspace resources error:', err);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

/**
 * PUT /workspaces/:id/resources/:resourceType - Update resource quota
 */
router.put('/:id/resources/:resourceType', [
  idParam,
  body('quota').isInt({ min: 0 }).withMessage('Quota must be a non-negative integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const resource = await workspaceService.updateResourceQuota(req.params.id, req.params.resourceType, req.body.quota, userId);
    res.json({ resource });
  } catch (err) {
    console.error('Update resource quota error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/permissions - Get member permissions
 */
router.get('/:id/permissions', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const canManage = await permissionService.canManagePermissions(userId, req.params.id);
    
    if (!canManage) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const members = workspaceService.getMembers(req.params.id);
    const permissions = {};
    
    for (const member of members) {
      permissions[member.user_id] = workspaceService.getMemberPermissions(req.params.id, member.id);
    }

    res.json({ permissions });
  } catch (err) {
    console.error('Get permissions error:', err);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

/**
 * POST /workspaces/:id/permissions - Grant permission
 */
router.post('/:id/permissions', [
  idParam,
  body('memberId').isInt().withMessage('Valid member ID required'),
  body('serviceType').trim().notEmpty().withMessage('Service type required'),
  body('action').trim().notEmpty().withMessage('Action required'),
  body('module').optional().isString(),
  body('conditions').optional().isObject(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { memberId, serviceType, action, module, conditions = {} } = req.body;
    
    await workspaceService.grantPermission(req.params.id, memberId, serviceType, action, module, userId, conditions);
    res.json({ success: true });
  } catch (err) {
    console.error('Grant permission error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /workspaces/:id/permissions - Revoke permission
 */
router.delete('/:id/permissions', [
  idParam,
  body('memberId').isInt().withMessage('Valid member ID required'),
  body('serviceType').trim().notEmpty().withMessage('Service type required'),
  body('action').trim().notEmpty().withMessage('Action required'),
  body('module').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { memberId, serviceType, action, module } = req.body;
    
    await workspaceService.revokePermission(req.params.id, memberId, serviceType, action, module, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Revoke permission error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /workspaces/:id/permission-matrix - Get permission matrix for UI
 */
router.get('/:id/permission-matrix', idParam, handleValidationErrors, requireWorkspace, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const matrix = await permissionService.getPermissionMatrix(userId, req.params.id);
    res.json({ matrix });
  } catch (err) {
    console.error('Get permission matrix error:', err);
    res.status(500).json({ error: 'Failed to get permission matrix' });
  }
});

/**
 * POST /workspaces/create-defaults - Create default workspaces for user
 */
router.post('/create-defaults', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const workspaces = await workspaceService.createDefaultWorkspaces(userId);
    res.status(201).json({ workspaces });
  } catch (err) {
    console.error('Create default workspaces error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;