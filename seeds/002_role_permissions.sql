-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions except billing.manage and white-label.edit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name NOT IN ('billing.manage', 'white-label.edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets view and create for most modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.name LIKE '%.view' OR p.name LIKE '%.create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Developer gets view for all, create/edit for ai, services, bots, website
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'developer' AND (
  p.name LIKE '%.view' OR
  p.name IN ('ai.create', 'ai.edit', 'services.create', 'services.edit', 'bots.create', 'website.create')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support gets view for users, requests, communication
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'support' AND p.name IN (
  'users.view', 'requests.view', 'requests.create', 'communication.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Billing gets view for billing, invoices
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'billing' AND p.name IN (
  'billing.view', 'billing.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets view for own services, ai, domains, databases, storage, website, requests.create
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
  'services.view', 'ai.view', 'domains.view', 'databases.view', 'storage.view',
  'website.view', 'requests.view', 'requests.create', 'file-manager.view', 'file-manager.upload'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer gets view for all modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name LIKE '%.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
