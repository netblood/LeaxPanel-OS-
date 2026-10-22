// Workspace Context Middleware
// Injects active workspace, member info, and permissions into req and res.locals

const workspaceService = require('../services/workspaceService');
const permissionService = require('../services/permissionService');

/**
 * Middleware to inject workspace context into all authenticated requests
 * Adds: req.workspace, req.workspaceMember, req.workspacePermissions, res.locals.activeWorkspace, res.locals.userWorkspaces
 */
async function workspaceContext(req, res, next) {
  // Only run for authenticated users
  if (!req.session?.user) {
    return next();
  }

  const userId = req.session.user.id;
  const isOwner = req.session.user.role === 'owner';

  try {
    // Get user's workspaces
    const userWorkspaces = await workspaceService.getUserWorkspaces(userId);

    // Determine active workspace
    let activeWorkspaceId = req.session.activeWorkspaceId;
    let activeWorkspace = null;

    // Check if workspace is specified in query/header (for workspace switching)
    const queryWorkspaceId = req.query.workspace;
    const headerWorkspaceId = req.headers['x-workspace-id'];

    if (queryWorkspaceId || headerWorkspaceId) {
      const targetWorkspaceId = queryWorkspaceId || headerWorkspaceId;
      // Verify user has access to this workspace
      const hasAccess = userWorkspaces.some(w => w.id === targetWorkspaceId);
      if (hasAccess) {
        activeWorkspaceId = targetWorkspaceId;
        // Store in session for persistence
        req.session.activeWorkspaceId = activeWorkspaceId;
      }
    }

    // If no active workspace but user has workspaces, use the first one
    if (!activeWorkspaceId && userWorkspaces.length > 0) {
      // Prefer default workspace, then first accessible
      const defaultWs = userWorkspaces.find(w => w.isDefault) || userWorkspaces[0];
      activeWorkspaceId = defaultWs.id;
      req.session.activeWorkspaceId = activeWorkspaceId;
    }

    // Get active workspace details
    if (activeWorkspaceId) {
      activeWorkspace = await workspaceService.getWorkspaceById(activeWorkspaceId);
      if (activeWorkspace) {
        // Get member info for this workspace
        const member = await workspaceService.getWorkspaceMember(activeWorkspaceId, userId);
        if (member) {
          req.workspaceMember = member;
          res.locals.workspaceMember = member;

          // Get effective permissions for this user in this workspace
          const permissions = await permissionService.getUserEffectivePermissions(activeWorkspaceId, userId);
          req.workspacePermissions = permissions;
          res.locals.workspacePermissions = permissions;
        }
      }
    }

    // Attach to request and response locals
    req.workspace = activeWorkspace;
    req.userWorkspaces = userWorkspaces;
    res.locals.activeWorkspace = activeWorkspace;
    res.locals.userWorkspaces = userWorkspaces;
    res.locals.workspaceTypes = {
      personal: { icon: '👤', label: 'Personal', color: '#8b5cf6' },
      clients: { icon: '🏢', label: 'Clients', color: '#06b6d4' },
      company: { icon: '🏭', label: 'Company', color: '#10b981' },
      development: { icon: '💻', label: 'Development', color: '#f59e0b' },
      production: { icon: '🚀', label: 'Production', color: '#ef4444' }
    };

    next();
  } catch (error) {
    console.error('Workspace context middleware error:', error);
    // Don't block the request on workspace context errors
    req.userWorkspaces = [];
    res.locals.userWorkspaces = [];
    next();
  }
}

/**
 * Middleware to require an active workspace
 * Redirects to workspace selection if no workspace is active
 */
function requireWorkspace(req, res, next) {
  if (!req.workspace) {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(400).json({ error: 'No active workspace. Please select a workspace.' });
    }
    req.flash('error', 'Please select a workspace to continue.');
    return res.redirect('/workspaces');
  }
  next();
}

/**
 * Middleware to require workspace membership
 * Ensures user is a member of the active workspace
 */
function requireWorkspaceMembership(req, res, next) {
  if (!req.workspaceMember) {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(403).json({ error: 'You are not a member of the active workspace.' });
    }
    req.flash('error', 'You do not have access to this workspace.');
    return res.redirect('/workspaces');
  }
  next();
}

/**
 * Middleware to check workspace-level permission
 * Usage: requireWorkspacePermission('workspace:manage')
 */
function requireWorkspacePermission(permission) {
  return (req, res, next) => {
    if (!req.workspacePermissions) {
      return res.status(403).json({ error: 'Workspace context not available' });
    }

    const hasPermission = req.workspacePermissions.includes(permission) ||
                         req.workspacePermissions.includes('*') ||
                         req.workspacePermissions.includes(permission.split(':')[0] + ':*');

    if (!hasPermission) {
      if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }
      req.flash('error', `You don't have permission to perform this action.`);
      return res.redirect('/dashboard');
    }

    next();
  };
}

/**
 * Middleware to check service-level permission within workspace
 * Usage: requireServicePermission('apps', 'create')
 */
function requireServicePermission(service, action) {
  return (req, res, next) => {
    if (!req.workspacePermissions) {
      return res.status(403).json({ error: 'Workspace context not available' });
    }

    const permissionKey = `${service}:${action}`;
    const hasPermission = req.workspacePermissions.includes(permissionKey) ||
                         req.workspacePermissions.includes(`${service}:*`) ||
                         req.workspacePermissions.includes('*');

    if (!hasPermission) {
      if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
        return res.status(403).json({ error: `Permission denied: ${permissionKey}` });
      }
      req.flash('error', `You don't have permission to ${action} ${service}.`);
      return res.redirect('/dashboard');
    }

    next();
  };
}

/**
 * Middleware to verify workspace ownership or admin role
 */
function requireWorkspaceAdmin(req, res, next) {
  if (!req.workspaceMember) {
    return res.status(403).json({ error: 'Workspace membership required' });
  }

  const adminRoles = ['owner', 'admin'];
  if (!adminRoles.includes(req.workspaceMember.role)) {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.flash('error', 'Admin access required.');
    return res.redirect('/dashboard');
  }

  next();
}

/**
 * Middleware to verify workspace ownership
 */
function requireWorkspaceOwner(req, res, next) {
  if (!req.workspaceMember) {
    return res.status(403).json({ error: 'Workspace membership required' });
  }

  if (req.workspaceMember.role !== 'owner') {
    if (req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/')) {
      return res.status(403).json({ error: 'Owner access required' });
    }
    req.flash('error', 'Owner access required.');
    return res.redirect('/dashboard');
  }

  next();
}

module.exports = {
  workspaceContext,
  requireWorkspace,
  requireWorkspaceMembership,
  requireWorkspacePermission,
  requireServicePermission,
  requireWorkspaceAdmin,
  requireWorkspaceOwner
};