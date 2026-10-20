INSERT INTO users (name, email, password, role, is_active, email_verified) VALUES
  ('Owner', 'owner@leaxos.local', '$2b$10$rFZ8vX8vX8vX8vX8vX8vXO', 'owner', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'owner@leaxos.local' AND r.name = 'owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
