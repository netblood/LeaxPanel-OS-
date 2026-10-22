// Role Based Access Control.
// The permission map is the single source of truth used by the router.
// Roles/permissions are also mirrored into SQLite (roles, permissions,
// role_permissions tables) so they can be inspected from the UI.
const db = require('../config/db');
const logger = require('../utils/logger');

const ROLES = [
  { name: 'owner', display_name: 'Owner', level: 100, description: 'Full access to all system features' },
  { name: 'admin', display_name: 'Administrator', level: 90, description: 'Administrative access to most features' },
  { name: 'reseller', display_name: 'Reseller', level: 80, description: 'Can resell services to customers' },
  { name: 'manager', display_name: 'Manager', level: 70, description: 'Can manage services and users' },
  { name: 'developer', display_name: 'Developer', level: 60, description: 'Can deploy and manage applications' },
  { name: 'support', display_name: 'Support', level: 50, description: 'Can view and respond to support requests' },
  { name: 'billing', display_name: 'Billing', level: 40, description: 'Can manage billing and invoices' },
  { name: 'user', display_name: 'User', level: 30, description: 'Standard user access' },
  { name: 'viewer', display_name: 'Viewer', level: 10, description: 'Read-only access to all features' }
];

const PERMISSIONS = [
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'apps:view', 'apps:create', 'apps:edit', 'apps:delete',
  'ai:view', 'ai:create', 'ai:edit', 'ai:delete',
  'monitoring:view',
  'backups:view', 'backups:create', 'backups:delete',
  'security:view', 'security:manage',
  'billing:view', 'billing:manage',
  'domains:view', 'domains:create', 'domains:edit', 'domains:delete',
  'databases:view', 'databases:create', 'databases:edit', 'databases:delete',
  'storage:view', 'storage:create', 'storage:edit', 'storage:delete',
  'communication:view',
  'filemanager:view', 'filemanager:upload', 'filemanager:edit', 'filemanager:delete',
  'whatsapp:view',
  'discord:view',
  'telegram:view',
  'n8n:view',
  'email:view',
  'cloudflare:view',
  'aihosting:view',
  'marketplace:view',
  'platform:view', 'platform:edit',
  'bots:view', 'bots:create', 'bots:edit', 'bots:delete',
  'website:view', 'website:create', 'website:edit', 'website:delete',
  'requests:view', 'requests:create', 'requests:edit', 'requests:delete',
  'whitelabel:view', 'whitelabel:edit',
  'settings:view', 'settings:edit',
  'apikeys:view', 'apikeys:create', 'apikeys:delete',
  'doctor:view', 'doctor:run',
  'terminal:view',
  'system:manage'
];

const VIEW_ONLY = PERMISSIONS.filter(p => p.endsWith(':view'));

const ROLE_PERMISSIONS = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter(p => p !== 'system:manage'),
  reseller: [
    'users:view', 'users:create', 'users:edit',
    'services:view', 'services:create', 'services:edit',
    'apps:view', 'apps:create', 'apps:edit',
    'ai:view', 'ai:create', 'ai:edit',
    'monitoring:view',
    'backups:view', 'backups:create',
    'billing:view',
    'domains:view', 'domains:create', 'domains:edit',
    'databases:view', 'databases:create', 'databases:edit',
    'storage:view', 'storage:create', 'storage:edit',
    'communication:view',
    'filemanager:view', 'filemanager:upload', 'filemanager:edit',
    'terminal:view',
    'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view',
    'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view',
    'bots:view', 'bots:create', 'website:view', 'website:create',
    'requests:view', 'requests:create', 'settings:view'
  ],
  reseller: [
    'users:view', 'users:create', 'users:edit',
    'services:view', 'services:create', 'services:edit',
    'apps:view', 'apps:create', 'apps:edit',
    'ai:view', 'ai:create', 'ai:edit',
    'monitoring:view',
    'backups:view', 'backups:create',
    'billing:view',
    'domains:view', 'domains:create', 'domains:edit',
    'databases:view', 'databases:create', 'databases:edit',
    'storage:view', 'storage:create', 'storage:edit',
    'communication:view',
    'filemanager:view', 'filemanager:upload', 'filemanager:edit',
    'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view',
    'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view',
    'bots:view', 'bots:create', 'website:view', 'website:create',
    'requests:view', 'requests:create', 'settings:view'
  ],
  manager: [
    'users:view', 'users:edit',
    'services:view', 'services:create', 'services:edit',
    'apps:view', 'apps:create', 'apps:edit', 'apps:delete',
    'ai:view', 'ai:create', 'ai:edit',
    'monitoring:view',
    'backups:view', 'backups:create',
    'security:view',
    'billing:view',
    'domains:view', 'domains:edit',
    'databases:view', 'databases:edit',
    'storage:view', 'storage:create', 'storage:edit',
    'communication:view',
    'filemanager:view', 'filemanager:upload', 'filemanager:edit', 'filemanager:delete',
      'terminal:view',
      'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view',
      'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view',
      'bots:view', 'bots:create', 'bots:edit',
      'website:view', 'website:create', 'website:edit',
      'requests:view', 'requests:create', 'requests:edit',
      'settings:view'
    ],
  developer: [
    'services:view', 'services:create', 'services:edit',
    'apps:view', 'apps:create', 'apps:edit', 'apps:delete',
    'ai:view', 'ai:create', 'ai:edit',
    'monitoring:view',
    'databases:view', 'databases:create', 'databases:edit',
    'storage:view', 'storage:create', 'storage:edit',
    'filemanager:view', 'filemanager:upload', 'filemanager:edit',
      'terminal:view',
      'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view',
      'marketplace:view', 'bots:view', 'bots:create', 'bots:edit',
      'website:view', 'website:create', 'website:edit',
      'requests:view', 'requests:create',
      'settings:view'
    ],
  support: [
    'users:view', 'users:edit',
    'services:view', 'apps:view',
    'monitoring:view', 'backups:view', 'security:view',
    'domains:view', 'databases:view', 'storage:view',
    'communication:view', 'filemanager:view',
      'terminal:view',
      'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view',
      'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view',
      'bots:view', 'website:view',
      'requests:view', 'requests:create', 'requests:edit',
      'settings:view'
    ],
  billing: [
    'users:view', 'services:view',
    'billing:view', 'billing:manage',
    'domains:view', 'databases:view', 'storage:view',
    'communication:view', 'filemanager:view', 'email:view',
    'marketplace:view', 'bots:view', 'website:view',
    'requests:view', 'settings:view'
  ],
  user: [
    'services:view', 'services:create',
    'apps:view', 'apps:create',
    'ai:view', 'ai:create',
    'domains:view', 'domains:create', 'domains:edit',
    'databases:view', 'databases:create', 'databases:edit',
    'storage:view', 'storage:create',
    'filemanager:view', 'filemanager:upload',
      'terminal:view',
      'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view',
      'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view',
      'bots:view', 'website:view',
      'requests:view', 'requests:create',
      'settings:view'
    ],
  viewer: VIEW_ONLY
};

function isApi(req) {
  return req.path.startsWith('/api/') || req.originalUrl?.startsWith('/api/');
}

function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (isApi(req)) return res.status(401).json({ error: 'Authentication required' });
      req.flash('error', 'Please log in to access this page.');
      return res.redirect('/login');
    }

    const role = req.session.user.role || 'viewer';
    const permissions = ROLE_PERMISSIONS[role] || [];

    if (role === 'owner' || permissions.includes(permission)) {
      return next();
    }

    if (isApi(req)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.flash('error', 'You do not have permission to access this resource.');
    return res.redirect('/dashboard');
  };
}

function checkRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (isApi(req)) return res.status(401).json({ error: 'Authentication required' });
      req.flash('error', 'Please log in to access this page.');
      return res.redirect('/login');
    }
    if (req.session.user.role === role || req.session.user.role === 'owner') {
      return next();
    }
    if (isApi(req)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    req.flash('error', 'You do not have the required role to access this resource.');
    return res.redirect('/dashboard');
  };
}

// Mirrors the in-code permission map into SQLite so the UI can list them.
function initializeRoles() {
  try {
    db.exec(`
      INSERT OR IGNORE INTO roles (name, display_name, description, is_system) VALUES
        ('owner', 'Owner', 'Full access to all system features', 1),
        ('admin', 'Administrator', 'Administrative access to most features', 1),
        ('reseller', 'Reseller', 'Can resell services to customers', 1),
        ('manager', 'Manager', 'Can manage services and users', 1),
        ('developer', 'Developer', 'Can deploy and manage applications', 1),
        ('support', 'Support', 'Can view and respond to support requests', 1),
        ('billing', 'Billing', 'Can manage billing and invoices', 1),
        ('user', 'User', 'Standard user access', 1),
        ('viewer', 'Viewer', 'Read-only access to all features', 1);
    `);

    for (const perm of PERMISSIONS) {
      const [module, action] = perm.split(':');
      db.run(
        `INSERT OR IGNORE INTO permissions (name, display_name, description, module)
         VALUES (?, ?, ?, ?)`,
        [perm, perm, `${action} ${module}`, module]
      );
    }

    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const perm of perms) {
        db.run(
          `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id FROM roles r, permissions p
           WHERE r.name = ? AND p.name = ?`,
          [role, perm]
        );
      }
    }
  } catch (err) {
    logger.warn('RBAC initialization skipped (tables may not exist yet):', err.message);
  }
}

function hasPermission(role, permission) {
  if (role === 'owner') return true;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

function getRolePermissions(role) {
  if (role === 'owner') return PERMISSIONS.slice();
  return (ROLE_PERMISSIONS[role] || []).slice();
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  checkPermission,
  checkRole,
  hasPermission,
  getRolePermissions,
  initializeRoles
};
