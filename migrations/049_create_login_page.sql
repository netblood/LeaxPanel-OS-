-- White-label Login Page Customization
CREATE TABLE IF NOT EXISTS login_page_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'color', 'file'
  label TEXT,
  description TEXT,
  category TEXT DEFAULT 'appearance', -- 'appearance', 'content', 'branding', 'advanced'
  sort_order INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 1, -- can be overridden by workspace
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO login_page_settings (setting_key, setting_value, setting_type, label, description, category, sort_order) VALUES
  -- Branding
  ('login_brand_name', 'LeaxPanel', 'string', 'Brand Name', 'Name displayed on login page', 'branding', 1),
  ('login_logo_url', '', 'file', 'Logo', 'Logo image URL (SVG/PNG recommended, max 200px wide)', 'branding', 2),
  ('login_favicon_url', '', 'file', 'Favicon', 'Favicon URL', 'branding', 3),
  
  -- Appearance
  ('login_background_type', 'gradient', 'string', 'Background Type', 'gradient, image, video, color, solid', 'appearance', 10),
  ('login_background_color', '#0a0b14', 'color', 'Background Color', 'Solid background color', 'appearance', 11),
  ('login_background_image_url', '', 'file', 'Background Image', 'Background image URL', 'appearance', 12),
  ('login_background_video_url', '', 'file', 'Background Video', 'Background video URL (MP4/WebM, muted, loop)', 'appearance', 13),
  ('login_background_overlay', 'rgba(10,11,20,0.85)', 'color', 'Background Overlay', 'Overlay color for readability', 'appearance', 14),
  ('login_primary_color', '#7c5cff', 'color', 'Primary Color', 'Primary brand color', 'appearance', 15),
  ('login_accent_color', '#22d3ee', 'color', 'Accent Color', 'Accent/highlight color', 'appearance', 16),
  ('login_font_family', 'Inter', 'string', 'Font Family', 'CSS font family', 'appearance', 17),
  ('login_border_radius', '12px', 'string', 'Border Radius', 'Card border radius', 'appearance', 18),
  ('login_animation', 'fade-slide', 'string', 'Animation', 'fade, slide, fade-slide, zoom, none', 'appearance', 19),
  
  -- Content
  ('login_title', 'Welcome Back', 'string', 'Title', 'Main heading text', 'content', 20),
  ('login_subtitle', 'Sign in to access your cloud platform', 'string', 'Subtitle', 'Description text below title', 'content', 21),
  ('login_footer_text', '© 2024 LeaxPanel. All rights reserved.', 'string', 'Footer Text', 'Footer copyright/legal text', 'content', 22),
  ('login_footer_links', '[{"label": "Privacy", "url": "/privacy"}, {"label": "Terms", "url": "/terms"}, {"label": "Support", "url": "/support"}]', 'json', 'Footer Links', 'JSON array of footer links', 'content', 23),
  ('login_show_register', '1', 'boolean', 'Show Register Link', 'Display register link on login page', 'content', 24),
  ('login_show_forgot_password', '1', 'boolean', 'Show Forgot Password', 'Display forgot password link', 'content', 25),
  ('login_show_sso_buttons', '0', 'boolean', 'Show SSO Buttons', 'Display OAuth/SSO login buttons', 'content', 26),
  
  -- Advanced
  ('login_custom_css', '', 'string', 'Custom CSS', 'Additional custom CSS', 'advanced', 30),
  ('login_custom_js', '', 'string', 'Custom JavaScript', 'Additional custom JavaScript', 'advanced', 31),
  ('login_redirect_after_login', '/dashboard', 'string', 'Post-Login Redirect', 'URL to redirect after successful login', 'advanced', 32),
  ('login_session_timeout', '86400000', 'number', 'Session Timeout (ms)', 'Session duration in milliseconds', 'advanced', 33),
  ('login_rate_limit', '10', 'number', 'Rate Limit (per minute)', 'Login attempts per minute per IP', 'advanced', 34),
  ('login_require_2fa', '0', 'boolean', 'Require 2FA', 'Force two-factor authentication', 'advanced', 35);

-- Workspace-specific login overrides
CREATE TABLE IF NOT EXISTS workspace_login_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workspace_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_wl_override_workspace ON workspace_login_overrides(workspace_id);