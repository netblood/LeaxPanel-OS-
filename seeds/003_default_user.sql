INSERT INTO users (name, email, password_hash, role, is_active, email_verified) VALUES
  ('Owner', 'owner@leaxos.local', '$2a$12$1/JJglEfsQQ/6fo61EV.ie.WvmoaH.D4KfGbUaLtpw4BFx1j85YKm', 'owner', 1, 1)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'owner@leaxos.local' AND r.name = 'owner'
ON CONFLICT (user_id, role_id) DO NOTHING;
