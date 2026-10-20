const pool = require('../config/database');

const ROLES = [
  { name: 'Owner', slug: 'owner', level: 100 },
  { name: 'Admin', slug: 'admin', level: 90 },
  { name: 'Reseller', slug: 'reseller', level: 80 },
  { name: 'Manager', slug: 'manager', level: 70 },
  { name: 'Developer', slug: 'developer', level: 60 },
  { name: 'Support', slug: 'support', level: 50 },
  { name: 'Billing', slug: 'billing', level: 40 },
  { name: 'User', slug: 'user', level: 30 },
  { name: 'Viewer', slug: 'viewer', level: 10 }
];

const PERMISSIONS = [
  'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'ai:view', 'ai:create', 'ai:edit', 'ai:delete',
  'monitoring:view', 'monitoring:manage',
  'backups:view', 'backups:create', 'backups:restore', 'backups:delete',
  'security:view', 'security:manage',
  'billing:view', 'billing:manage',
  'domains:view', 'domains:create', 'domains:edit', 'domains:delete',
  'databases:view', 'databases:create', 'databases:edit', 'databases:delete',
  'storage:view', 'storage:create', 'storage:edit', 'storage:delete',
  'communication:view', 'communication:manage',
  'filemanager:view', 'filemanager:create', 'filemanager:edit', 'filemanager:delete',
  'whatsapp:view', 'whatsapp:manage',
  'discord:view', 'discord:manage',
  'telegram:view', 'telegram:manage',
  'n8n:view', 'n8n:manage',
  'email:view', 'email:manage',
  'cloudflare:view', 'cloudflare:manage',
  'aihosting:view', 'aihosting:manage',
  'marketplace:view', 'marketplace:manage',
  'platform:view', 'platform:manage',
  'bots:view', 'bots:manage',
  'website:view', 'website:manage',
  'requests:view', 'requests:manage',
  'whitelabel:view', 'whitelabel:manage',
  'roles:view', 'roles:manage',
  'audit:view', 'audit:manage',
  'system:manage'
];

const ROLE_PERMISSIONS = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter(p => !p.includes('system:manage')),
  reseller: ['users:view', 'users:create', 'users:edit', 'services:view', 'services:create', 'services:edit', 'billing:view', 'domains:view', 'domains:create', 'domains:edit', 'databases:view', 'databases:create', 'databases:edit', 'storage:view', 'storage:create', 'storage:edit', 'communication:view', 'filemanager:view', 'filemanager:create', 'filemanager:edit', 'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'website:view', 'requests:view', 'whitelabel:view'],
  manager: ['users:view', 'users:edit', 'services:view', 'services:create', 'services:edit', 'ai:view', 'ai:create', 'ai:edit', 'monitoring:view', 'backups:view', 'backups:create', 'security:view', 'billing:view', 'domains:view', 'domains:edit', 'databases:view', 'databases:edit', 'storage:view', 'storage:create', 'storage:edit', 'communication:view', 'filemanager:view', 'filemanager:create', 'filemanager:edit', 'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'website:view', 'requests:view', 'whitelabel:view'],
  developer: ['services:view', 'services:create', 'services:edit', 'ai:view', 'ai:create', 'ai:edit', 'monitoring:view', 'databases:view', 'databases:create', 'databases:edit', 'storage:view', 'storage:create', 'storage:edit', 'filemanager:view', 'filemanager:create', 'filemanager:edit', 'n8n:view', 'n8n:manage', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'bots:manage', 'website:view', 'website:manage', 'requests:view'],
  support: ['users:view', 'users:edit', 'services:view', 'monitoring:view', 'backups:view', 'security:view', 'domains:view', 'databases:view', 'storage:view', 'communication:view', 'filemanager:view', 'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'website:view', 'requests:view', 'requests:manage'],
  billing: ['users:view', 'services:view', 'billing:view', 'billing:manage', 'domains:view', 'databases:view', 'storage:view', 'communication:view', 'filemanager:view', 'email:view', 'marketplace:view', 'platform:view', 'bots:view', 'website:view', 'requests:view'],
  user: ['services:view', 'services:create', 'ai:view', 'ai:create', 'domains:view', 'domains:create', 'domains:edit', 'databases:view', 'databases:create', 'databases:edit', 'storage:view', 'storage:create', 'storage:edit', 'filemanager:view', 'filemanager:create', 'filemanager:edit', 'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'bots:manage', 'website:view', 'website:manage', 'requests:view', 'requests:manage'],
  viewer: ['users:view', 'services:view', 'ai:view', 'monitoring:view', 'backups:view', 'security:view', 'billing:view', 'domains:view', 'databases:view', 'storage:view', 'communication:view', 'filemanager:view', 'whatsapp:view', 'discord:view', 'telegram:view', 'n8n:view', 'email:view', 'cloudflare:view', 'aihosting:view', 'marketplace:view', 'platform:view', 'bots:view', 'website:view', 'requests:view', 'whitelabel:view']
};

function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.session.user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/login');
    }
    const userRole = req.session.user.role || 'viewer';
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    if (permissions.includes(permission) || userRole === 'owner') {
      return next();
    }
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.flash('error', 'You do not have permission to access this resource.');
    return res.redirect('/dashboard');
  };
}

function checkRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/login');
    }
    if (req.session.user.role === role || req.session.user.role === 'owner') {
      return next();
    }
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    req.flash('error', 'You do not have the required role to access this resource.');
    return res.redirect('/dashboard');
  };
}

async function initializeRoles() {
  try {
    for (const role of ROLES) {
      await pool.query(
        `INSERT INTO roles (name, slug, level) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, level = EXCLUDED.level`,
        [role.name, role.slug, role.level]
      );
    }
    for (const [roleSlug, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        await pool.query(
          `INSERT INTO role_permissions (role_slug, permission) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleSlug, permission]
        );
      }
    }
  } catch (err) {
    console.warn('RBAC initialization skipped (tables may not exist yet):', err.message);
  }
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  checkPermission,
  checkRole,
  initializeRoles
};
