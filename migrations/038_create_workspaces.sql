-- Workspace Management Tables
-- Enables Owner-Controlled Model and Smart Workspace Mode

-- Workspaces: Root containers for isolation (Personal, Clients, Company, Development, Production)
CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'personal', -- personal, clients, company, development, production
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- active, archived, suspended
    settings TEXT DEFAULT '{}', -- JSON: feature flags, limits, branding
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);

-- Workspace Members: Users assigned to workspaces with roles
CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- owner, admin, manager, developer, member, viewer
    permissions TEXT DEFAULT '[]', -- JSON array of permission strings specific to this workspace
    status TEXT NOT NULL DEFAULT 'active', -- active, invited, suspended
    joined_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);

-- Workspace Services: Services assigned to workspaces
CREATE TABLE IF NOT EXISTS workspace_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- apps, websites, databases, storage, bots, ai, email, communication, etc.
    service_id INTEGER NOT NULL, -- References the actual service record
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TEXT DEFAULT (datetime('now')),
    resource_limits TEXT DEFAULT '{}', -- JSON: cpu, memory, storage, bandwidth limits
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended, error
    metadata TEXT DEFAULT '{}', -- Additional service-specific config
    UNIQUE(workspace_id, service_type, service_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_services_workspace ON workspace_services(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_services_type ON workspace_services(service_type);
CREATE INDEX IF NOT EXISTS idx_workspace_services_status ON workspace_services(status);

-- Workspace Domains: Domains assigned to workspaces
CREATE TABLE IF NOT EXISTS workspace_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TEXT DEFAULT (datetime('now')),
    permissions TEXT DEFAULT '[]', -- JSON: subdomains, ssl, dns, redirect permissions
    status TEXT NOT NULL DEFAULT 'active',
    UNIQUE(workspace_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_domains_workspace ON workspace_domains(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_domains_domain ON workspace_domains(domain_id);

-- Workspace Resources: Resource allocations per workspace
CREATE TABLE IF NOT EXISTS workspace_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- cpu, memory, storage, bandwidth, databases, domains, bots, ai_agents, email_accounts, backups, api_keys
    quota INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited
    used INTEGER NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'count', -- count, mb, gb, cpu_units, bandwidth_gb
    period TEXT DEFAULT 'monthly', -- monthly, total
    reset_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_workspace_resources_workspace ON workspace_resources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_resources_type ON workspace_resources(resource_type);

-- Workspace Permissions: Granular permissions per workspace, service, action, module
CREATE TABLE IF NOT EXISTS workspace_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- apps, websites, databases, storage, bots, ai, email, domains, ssl, backups, monitoring, filemanager, terminal, api, workflows
    action TEXT NOT NULL, -- create, read, update, delete, restart, deploy, terminal, filemanager, logs, backup, restore, ssl, dns, ai, api, workflow
    module TEXT, -- Optional: specific module within service (e.g., 'deploy', 'config', 'scaling')
    allowed BOOLEAN NOT NULL DEFAULT 1,
    conditions TEXT DEFAULT '{}', -- JSON: conditions like {"environment": "production", "max_instances": 3}
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, member_id, service_type, action, module)
);

CREATE INDEX IF NOT EXISTS idx_workspace_permissions_workspace ON workspace_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_permissions_member ON workspace_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_workspace_permissions_service ON workspace_permissions(service_type, action);

-- Workspace Activity Log: Track workspace-level actions
CREATE TABLE IF NOT EXISTS workspace_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- switched, created, updated, deleted, member_added, member_removed, service_assigned, domain_assigned
    resource_type TEXT, -- workspace, member, service, domain, resource
    resource_id INTEGER,
    details TEXT DEFAULT '{}', -- JSON details
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace ON workspace_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user ON workspace_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_action ON workspace_activity(action);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_created ON workspace_activity(created_at);

-- Default workspace permissions templates (for role-based defaults)
CREATE TABLE IF NOT EXISTS workspace_permission_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- owner, admin, manager, developer, member, viewer
    service_type TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT,
    allowed BOOLEAN NOT NULL DEFAULT 1,
    conditions TEXT DEFAULT '{}',
    description TEXT,
    UNIQUE(name, service_type, action, module)
);

-- Insert default permission templates
INSERT OR IGNORE INTO workspace_permission_templates (name, service_type, action, module, allowed, description) VALUES
-- Owner - full access
('owner', 'apps', 'create', NULL, 1, 'Create applications'),
('owner', 'apps', 'read', NULL, 1, 'View applications'),
('owner', 'apps', 'update', NULL, 1, 'Update applications'),
('owner', 'apps', 'delete', NULL, 1, 'Delete applications'),
('owner', 'apps', 'restart', NULL, 1, 'Restart applications'),
('owner', 'apps', 'terminal', NULL, 1, 'Access terminal'),
('owner', 'apps', 'filemanager', NULL, 1, 'Access file manager'),
('owner', 'apps', 'logs', NULL, 1, 'View logs'),
('owner', 'apps', 'deploy', NULL, 1, 'Deploy applications'),
('owner', 'apps', 'scale', NULL, 1, 'Scale applications'),

('owner', 'websites', 'create', NULL, 1, 'Create websites'),
('owner', 'websites', 'read', NULL, 1, 'View websites'),
('owner', 'websites', 'update', NULL, 1, 'Update websites'),
('owner', 'websites', 'delete', NULL, 1, 'Delete websites'),
('owner', 'websites', 'ssl', NULL, 1, 'Manage SSL'),
('owner', 'websites', 'dns', NULL, 1, 'Manage DNS'),

('owner', 'databases', 'create', NULL, 1, 'Create databases'),
('owner', 'databases', 'read', NULL, 1, 'View databases'),
('owner', 'databases', 'update', NULL, 1, 'Update databases'),
('owner', 'databases', 'delete', NULL, 1, 'Delete databases'),
('owner', 'databases', 'backup', NULL, 1, 'Backup databases'),
('owner', 'databases', 'restore', NULL, 1, 'Restore databases'),

('owner', 'storage', 'create', NULL, 1, 'Create storage buckets'),
('owner', 'storage', 'read', NULL, 1, 'View storage'),
('owner', 'storage', 'update', NULL, 1, 'Update storage'),
('owner', 'storage', 'delete', NULL, 1, 'Delete storage'),

('owner', 'bots', 'create', NULL, 1, 'Create bots'),
('owner', 'bots', 'read', NULL, 1, 'View bots'),
('owner', 'bots', 'update', NULL, 1, 'Update bots'),
('owner', 'bots', 'delete', NULL, 1, 'Delete bots'),
('owner', 'bots', 'restart', NULL, 1, 'Restart bots'),

('owner', 'ai', 'create', NULL, 1, 'Create AI agents'),
('owner', 'ai', 'read', NULL, 1, 'View AI agents'),
('owner', 'ai', 'update', NULL, 1, 'Update AI agents'),
('owner', 'ai', 'delete', NULL, 1, 'Delete AI agents'),
('owner', 'ai', 'configure', NULL, 1, 'Configure AI agents'),

('owner', 'email', 'create', NULL, 1, 'Create email accounts'),
('owner', 'email', 'read', NULL, 1, 'View email accounts'),
('owner', 'email', 'update', NULL, 1, 'Update email accounts'),
('owner', 'email', 'delete', NULL, 1, 'Delete email accounts'),

('owner', 'domains', 'create', NULL, 1, 'Add domains'),
('owner', 'domains', 'read', NULL, 1, 'View domains'),
('owner', 'domains', 'update', NULL, 1, 'Update domains'),
('owner', 'domains', 'delete', NULL, 1, 'Delete domains'),
('owner', 'domains', 'ssl', NULL, 1, 'Manage SSL certificates'),
('owner', 'domains', 'dns', NULL, 1, 'Manage DNS records'),
('owner', 'domains', 'subdomain', NULL, 1, 'Create subdomains'),

('owner', 'backups', 'create', NULL, 1, 'Create backups'),
('owner', 'backups', 'read', NULL, 1, 'View backups'),
('owner', 'backups', 'delete', NULL, 1, 'Delete backups'),
('owner', 'backups', 'restore', NULL, 1, 'Restore backups'),

('owner', 'monitoring', 'read', NULL, 1, 'View monitoring'),
('owner', 'monitoring', 'configure', NULL, 1, 'Configure monitoring'),

('owner', 'filemanager', 'read', NULL, 1, 'Browse files'),
('owner', 'filemanager', 'upload', NULL, 1, 'Upload files'),
('owner', 'filemanager', 'edit', NULL, 1, 'Edit files'),
('owner', 'filemanager', 'delete', NULL, 1, 'Delete files'),

('owner', 'terminal', 'access', NULL, 1, 'Access terminal'),

('owner', 'api', 'create', NULL, 1, 'Create API keys'),
('owner', 'api', 'read', NULL, 1, 'View API keys'),
('owner', 'api', 'delete', NULL, 1, 'Delete API keys'),

('owner', 'workflows', 'create', NULL, 1, 'Create workflows'),
('owner', 'workflows', 'read', NULL, 1, 'View workflows'),
('owner', 'workflows', 'update', NULL, 1, 'Update workflows'),
('owner', 'workflows', 'delete', NULL, 1, 'Delete workflows'),
('owner', 'workflows', 'execute', NULL, 1, 'Execute workflows'),

-- Admin - almost full access, no system manage
('admin', 'apps', 'create', NULL, 1, 'Create applications'),
('admin', 'apps', 'read', NULL, 1, 'View applications'),
('admin', 'apps', 'update', NULL, 1, 'Update applications'),
('admin', 'apps', 'delete', NULL, 1, 'Delete applications'),
('admin', 'apps', 'restart', NULL, 1, 'Restart applications'),
('admin', 'apps', 'terminal', NULL, 1, 'Access terminal'),
('admin', 'apps', 'filemanager', NULL, 1, 'Access file manager'),
('admin', 'apps', 'logs', NULL, 1, 'View logs'),
('admin', 'apps', 'deploy', NULL, 1, 'Deploy applications'),
('admin', 'apps', 'scale', NULL, 1, 'Scale applications'),

('admin', 'websites', 'create', NULL, 1, 'Create websites'),
('admin', 'websites', 'read', NULL, 1, 'View websites'),
('admin', 'websites', 'update', NULL, 1, 'Update websites'),
('admin', 'websites', 'delete', NULL, 1, 'Delete websites'),
('admin', 'websites', 'ssl', NULL, 1, 'Manage SSL'),
('admin', 'websites', 'dns', NULL, 1, 'Manage DNS'),

('admin', 'databases', 'create', NULL, 1, 'Create databases'),
('admin', 'databases', 'read', NULL, 1, 'View databases'),
('admin', 'databases', 'update', NULL, 1, 'Update databases'),
('admin', 'databases', 'delete', NULL, 1, 'Delete databases'),
('admin', 'databases', 'backup', NULL, 1, 'Backup databases'),
('admin', 'databases', 'restore', NULL, 1, 'Restore databases'),

('admin', 'storage', 'create', NULL, 1, 'Create storage buckets'),
('admin', 'storage', 'read', NULL, 1, 'View storage'),
('admin', 'storage', 'update', NULL, 1, 'Update storage'),
('admin', 'storage', 'delete', NULL, 1, 'Delete storage'),

('admin', 'bots', 'create', NULL, 1, 'Create bots'),
('admin', 'bots', 'read', NULL, 1, 'View bots'),
('admin', 'bots', 'update', NULL, 1, 'Update bots'),
('admin', 'bots', 'delete', NULL, 1, 'Delete bots'),
('admin', 'bots', 'restart', NULL, 1, 'Restart bots'),

('admin', 'ai', 'create', NULL, 1, 'Create AI agents'),
('admin', 'ai', 'read', NULL, 1, 'View AI agents'),
('admin', 'ai', 'update', NULL, 1, 'Update AI agents'),
('admin', 'ai', 'delete', NULL, 1, 'Delete AI agents'),
('admin', 'ai', 'configure', NULL, 1, 'Configure AI agents'),

('admin', 'email', 'create', NULL, 1, 'Create email accounts'),
('admin', 'email', 'read', NULL, 1, 'View email accounts'),
('admin', 'email', 'update', NULL, 1, 'Update email accounts'),
('admin', 'email', 'delete', NULL, 1, 'Delete email accounts'),

('admin', 'domains', 'create', NULL, 1, 'Add domains'),
('admin', 'domains', 'read', NULL, 1, 'View domains'),
('admin', 'domains', 'update', NULL, 1, 'Update domains'),
('admin', 'domains', 'delete', NULL, 1, 'Delete domains'),
('admin', 'domains', 'ssl', NULL, 1, 'Manage SSL certificates'),
('admin', 'domains', 'dns', NULL, 1, 'Manage DNS records'),
('admin', 'domains', 'subdomain', NULL, 1, 'Create subdomains'),

('admin', 'backups', 'create', NULL, 1, 'Create backups'),
('admin', 'backups', 'read', NULL, 1, 'View backups'),
('admin', 'backups', 'delete', NULL, 1, 'Delete backups'),
('admin', 'backups', 'restore', NULL, 1, 'Restore backups'),

('admin', 'monitoring', 'read', NULL, 1, 'View monitoring'),
('admin', 'monitoring', 'configure', NULL, 1, 'Configure monitoring'),

('admin', 'filemanager', 'read', NULL, 1, 'Browse files'),
('admin', 'filemanager', 'upload', NULL, 1, 'Upload files'),
('admin', 'filemanager', 'edit', NULL, 1, 'Edit files'),
('admin', 'filemanager', 'delete', NULL, 1, 'Delete files'),

('admin', 'terminal', 'access', NULL, 1, 'Access terminal'),

('admin', 'api', 'create', NULL, 1, 'Create API keys'),
('admin', 'api', 'read', NULL, 1, 'View API keys'),
('admin', 'api', 'delete', NULL, 1, 'Delete API keys'),

('admin', 'workflows', 'create', NULL, 1, 'Create workflows'),
('admin', 'workflows', 'read', NULL, 1, 'View workflows'),
('admin', 'workflows', 'update', NULL, 1, 'Update workflows'),
('admin', 'workflows', 'delete', NULL, 1, 'Delete workflows'),
('admin', 'workflows', 'execute', NULL, 1, 'Execute workflows'),

-- Manager - manage services and users
('manager', 'apps', 'create', NULL, 1, 'Create applications'),
('manager', 'apps', 'read', NULL, 1, 'View applications'),
('manager', 'apps', 'update', NULL, 1, 'Update applications'),
('manager', 'apps', 'delete', NULL, 1, 'Delete applications'),
('manager', 'apps', 'restart', NULL, 1, 'Restart applications'),
('manager', 'apps', 'terminal', NULL, 1, 'Access terminal'),
('manager', 'apps', 'filemanager', NULL, 1, 'Access file manager'),
('manager', 'apps', 'logs', NULL, 1, 'View logs'),
('manager', 'apps', 'deploy', NULL, 1, 'Deploy applications'),

('manager', 'websites', 'create', NULL, 1, 'Create websites'),
('manager', 'websites', 'read', NULL, 1, 'View websites'),
('manager', 'websites', 'update', NULL, 1, 'Update websites'),
('manager', 'websites', 'delete', NULL, 1, 'Delete websites'),
('manager', 'websites', 'ssl', NULL, 1, 'Manage SSL'),
('manager', 'websites', 'dns', NULL, 1, 'Manage DNS'),

('manager', 'databases', 'create', NULL, 1, 'Create databases'),
('manager', 'databases', 'read', NULL, 1, 'View databases'),
('manager', 'databases', 'update', NULL, 1, 'Update databases'),
('manager', 'databases', 'delete', NULL, 1, 'Delete databases'),
('manager', 'databases', 'backup', NULL, 1, 'Backup databases'),
('manager', 'databases', 'restore', NULL, 1, 'Restore databases'),

('manager', 'storage', 'create', NULL, 1, 'Create storage buckets'),
('manager', 'storage', 'read', NULL, 1, 'View storage'),
('manager', 'storage', 'update', NULL, 1, 'Update storage'),
('manager', 'storage', 'delete', NULL, 1, 'Delete storage'),

('manager', 'bots', 'create', NULL, 1, 'Create bots'),
('manager', 'bots', 'read', NULL, 1, 'View bots'),
('manager', 'bots', 'update', NULL, 1, 'Update bots'),
('manager', 'bots', 'delete', NULL, 1, 'Delete bots'),
('manager', 'bots', 'restart', NULL, 1, 'Restart bots'),

('manager', 'ai', 'create', NULL, 1, 'Create AI agents'),
('manager', 'ai', 'read', NULL, 1, 'View AI agents'),
('manager', 'ai', 'update', NULL, 1, 'Update AI agents'),
('manager', 'ai', 'delete', NULL, 1, 'Delete AI agents'),
('manager', 'ai', 'configure', NULL, 1, 'Configure AI agents'),

('manager', 'email', 'create', NULL, 1, 'Create email accounts'),
('manager', 'email', 'read', NULL, 1, 'View email accounts'),
('manager', 'email', 'update', NULL, 1, 'Update email accounts'),
('manager', 'email', 'delete', NULL, 1, 'Delete email accounts'),

('manager', 'domains', 'create', NULL, 1, 'Add domains'),
('manager', 'domains', 'read', NULL, 1, 'View domains'),
('manager', 'domains', 'update', NULL, 1, 'Update domains'),
('manager', 'domains', 'delete', NULL, 1, 'Delete domains'),
('manager', 'domains', 'ssl', NULL, 1, 'Manage SSL certificates'),
('manager', 'domains', 'dns', NULL, 1, 'Manage DNS records'),
('manager', 'domains', 'subdomain', NULL, 1, 'Create subdomains'),

('manager', 'backups', 'create', NULL, 1, 'Create backups'),
('manager', 'backups', 'read', NULL, 1, 'View backups'),
('manager', 'backups', 'delete', NULL, 1, 'Delete backups'),
('manager', 'backups', 'restore', NULL, 1, 'Restore backups'),

('manager', 'monitoring', 'read', NULL, 1, 'View monitoring'),
('manager', 'monitoring', 'configure', NULL, 1, 'Configure monitoring'),

('manager', 'filemanager', 'read', NULL, 1, 'Browse files'),
('manager', 'filemanager', 'upload', NULL, 1, 'Upload files'),
('manager', 'filemanager', 'edit', NULL, 1, 'Edit files'),
('manager', 'filemanager', 'delete', NULL, 1, 'Delete files'),

('manager', 'terminal', 'access', NULL, 1, 'Access terminal'),

('manager', 'api', 'create', NULL, 1, 'Create API keys'),
('manager', 'api', 'read', NULL, 1, 'View API keys'),
('manager', 'api', 'delete', NULL, 1, 'Delete API keys'),

('manager', 'workflows', 'create', NULL, 1, 'Create workflows'),
('manager', 'workflows', 'read', NULL, 1, 'View workflows'),
('manager', 'workflows', 'update', NULL, 1, 'Update workflows'),
('manager', 'workflows', 'delete', NULL, 1, 'Delete workflows'),
('manager', 'workflows', 'execute', NULL, 1, 'Execute workflows'),

-- Developer - deploy and manage applications
('developer', 'apps', 'create', NULL, 1, 'Create applications'),
('developer', 'apps', 'read', NULL, 1, 'View applications'),
('developer', 'apps', 'update', NULL, 1, 'Update applications'),
('developer', 'apps', 'restart', NULL, 1, 'Restart applications'),
('developer', 'apps', 'terminal', NULL, 1, 'Access terminal'),
('developer', 'apps', 'filemanager', NULL, 1, 'Access file manager'),
('developer', 'apps', 'logs', NULL, 1, 'View logs'),
('developer', 'apps', 'deploy', NULL, 1, 'Deploy applications'),

('developer', 'websites', 'create', NULL, 1, 'Create websites'),
('developer', 'websites', 'read', NULL, 1, 'View websites'),
('developer', 'websites', 'update', NULL, 1, 'Update websites'),
('developer', 'websites', 'ssl', NULL, 1, 'Manage SSL'),
('developer', 'websites', 'dns', NULL, 1, 'Manage DNS'),

('developer', 'databases', 'create', NULL, 1, 'Create databases'),
('developer', 'databases', 'read', NULL, 1, 'View databases'),
('developer', 'databases', 'update', NULL, 1, 'Update databases'),
('developer', 'databases', 'backup', NULL, 1, 'Backup databases'),

('developer', 'storage', 'create', NULL, 1, 'Create storage buckets'),
('developer', 'storage', 'read', NULL, 1, 'View storage'),
('developer', 'storage', 'update', NULL, 1, 'Update storage'),

('developer', 'bots', 'create', NULL, 1, 'Create bots'),
('developer', 'bots', 'read', NULL, 1, 'View bots'),
('developer', 'bots', 'update', NULL, 1, 'Update bots'),
('developer', 'bots', 'restart', NULL, 1, 'Restart bots'),

('developer', 'ai', 'create', NULL, 1, 'Create AI agents'),
('developer', 'ai', 'read', NULL, 1, 'View AI agents'),
('developer', 'ai', 'update', NULL, 1, 'Update AI agents'),
('developer', 'ai', 'configure', NULL, 1, 'Configure AI agents'),

('developer', 'email', 'create', NULL, 1, 'Create email accounts'),
('developer', 'email', 'read', NULL, 1, 'View email accounts'),
('developer', 'email', 'update', NULL, 1, 'Update email accounts'),

('developer', 'domains', 'read', NULL, 1, 'View domains'),
('developer', 'domains', 'subdomain', NULL, 1, 'Create subdomains'),

('developer', 'backups', 'create', NULL, 1, 'Create backups'),
('developer', 'backups', 'read', NULL, 1, 'View backups'),

('developer', 'monitoring', 'read', NULL, 1, 'View monitoring'),

('developer', 'filemanager', 'read', NULL, 1, 'Browse files'),
('developer', 'filemanager', 'upload', NULL, 1, 'Upload files'),
('developer', 'filemanager', 'edit', NULL, 1, 'Edit files'),

('developer', 'terminal', 'access', NULL, 1, 'Access terminal'),

('developer', 'api', 'create', NULL, 1, 'Create API keys'),
('developer', 'api', 'read', NULL, 1, 'View API keys'),

('developer', 'workflows', 'create', NULL, 1, 'Create workflows'),
('developer', 'workflows', 'read', NULL, 1, 'View workflows'),
('developer', 'workflows', 'update', NULL, 1, 'Update workflows'),
('developer', 'workflows', 'execute', NULL, 1, 'Execute workflows'),

-- Member - basic access
('member', 'apps', 'read', NULL, 1, 'View applications'),
('member', 'apps', 'logs', NULL, 1, 'View logs'),

('member', 'websites', 'read', NULL, 1, 'View websites'),

('member', 'databases', 'read', NULL, 1, 'View databases'),

('member', 'storage', 'read', NULL, 1, 'View storage'),

('member', 'bots', 'read', NULL, 1, 'View bots'),

('member', 'ai', 'read', NULL, 1, 'View AI agents'),

('member', 'email', 'read', NULL, 1, 'View email accounts'),

('member', 'domains', 'read', NULL, 1, 'View domains'),

('member', 'backups', 'read', NULL, 1, 'View backups'),

('member', 'monitoring', 'read', NULL, 1, 'View monitoring'),

('member', 'filemanager', 'read', NULL, 1, 'Browse files'),

('member', 'api', 'read', NULL, 1, 'View API keys'),

('member', 'workflows', 'read', NULL, 1, 'View workflows'),

-- Viewer - read only
('viewer', 'apps', 'read', NULL, 1, 'View applications'),
('viewer', 'websites', 'read', NULL, 1, 'View websites'),
('viewer', 'databases', 'read', NULL, 1, 'View databases'),
('viewer', 'storage', 'read', NULL, 1, 'View storage'),
('viewer', 'bots', 'read', NULL, 1, 'View bots'),
('viewer', 'ai', 'read', NULL, 1, 'View AI agents'),
('viewer', 'email', 'read', NULL, 1, 'View email accounts'),
('viewer', 'domains', 'read', NULL, 1, 'View domains'),
('viewer', 'backups', 'read', NULL, 1, 'View backups'),
('viewer', 'monitoring', 'read', NULL, 1, 'View monitoring'),
('viewer', 'filemanager', 'read', NULL, 1, 'Browse files'),
('viewer', 'api', 'read', NULL, 1, 'View API keys'),
('viewer', 'workflows', 'read', NULL, 1, 'View workflows');