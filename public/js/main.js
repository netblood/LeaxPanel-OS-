/* ==========================================================================
   LeaxPanel - Frontend runtime
   Vanilla JS, no build step. Handles: theme, sidebar, global search,
   quick-create modal, toasts, dropdowns, table helpers, Socket.IO.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEYS = {
    theme: 'leax.theme',
    sidebar: 'leax.sidebarCollapsed'
  };

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, wait) {
    let timer;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait || 180);
    };
  }

  /* --------------------------------------------------------------- theme */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch (e) { /* private mode */ }
  }

  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEYS.theme); } catch (e) { /* ignore */ }

    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(stored || (prefersLight ? 'light' : 'dark'));

    const toggle = $('#themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }
  }

  /* ------------------------------------------------------------- sidebar */
  function initSidebar() {
    const body = document.body;

    let collapsed = false;
    try { collapsed = localStorage.getItem(STORAGE_KEYS.sidebar) === '1'; } catch (e) { /* ignore */ }
    if (collapsed) body.classList.add('sidebar-collapsed');

    const collapseBtn = $('#sidebarCollapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        body.classList.toggle('sidebar-collapsed');
        try { localStorage.setItem(STORAGE_KEYS.sidebar, body.classList.contains('sidebar-collapsed') ? '1' : '0'); } catch (e) { /* ignore */ }
      });
    }

    const mobileBtn = $('#mobileMenu');
    const overlay = $('#sidebarOverlay');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        body.classList.add('mobile-nav-open');
        if (overlay) overlay.hidden = false;
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        body.classList.remove('mobile-nav-open');
        overlay.hidden = true;
      });
    }

    // Close mobile nav when a link is tapped
    $$('.sidebar .nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 860) {
          body.classList.remove('mobile-nav-open');
          if (overlay) overlay.hidden = true;
        }
      });
    });
  }

  /* ------------------------------------------------------------- dropdowns */
  function initDropdowns() {
    const pairs = [
      ['#notificationBtn', '#notificationPanel'],
      ['#userMenuBtn', '#userMenu']
    ].map(([btnSel, panelSel]) => ({ btnSel, panelSel, btn: $(btnSel), panel: $(panelSel) }))
      .filter(p => p.btn && p.panel);

    const closeAll = () => pairs.forEach(p => { p.panel.hidden = true; });

    pairs.forEach(({ btn, panel }) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !panel.hidden;
        closeAll();
        panel.hidden = isOpen;
      });
    });

    document.addEventListener('click', closeAll);

    $$('.dropdown-panel').forEach(panel => {
      panel.addEventListener('click', (e) => e.stopPropagation());
    });
  }

  /* --------------------------------------------------------------- toasts */
  function toastStack() {
    let stack = $('#toastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toastStack';
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type) {
    const kind = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="toast-bar"></span><span class="toast-msg">' + escapeHtml(message) + '</span>';
    toastStack().appendChild(el);

    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 220);
    }, 4500);
  }
  window.leaxToast = toast;

  /* --------------------------------------------------------------- search */
  const SEARCH_INDEX = [
    { label: 'Dashboard', href: '/dashboard', type: 'Page' },
    { label: 'Monitoring', href: '/monitoring', type: 'Page' },
    { label: 'Backups', href: '/backups', type: 'Page' },
    { label: 'Domains & DNS', href: '/domains', type: 'Page' },
    { label: 'Websites', href: '/website', type: 'Page' },
    { label: 'Applications', href: '/apps', type: 'Page' },
    { label: 'File Manager', href: '/file-manager', type: 'Page' },
    { label: 'Storage Buckets', href: '/storage', type: 'Page' },
    { label: 'N8N Workflows', href: '/n8n', type: 'Page' },
    { label: 'Telegram Bots', href: '/telegram', type: 'Page' },
    { label: 'Discord Bots', href: '/discord', type: 'Page' },
    { label: 'WhatsApp Instances', href: '/whatsapp', type: 'Page' },
    { label: 'All Bots', href: '/bots', type: 'Page' },
    { label: 'AI Agents', href: '/ai', type: 'Page' },
    { label: 'AI Providers', href: '/ai-settings', type: 'Page' },
    { label: 'AI Hosting', href: '/ai-hosting', type: 'Page' },
    { label: 'Databases', href: '/databases', type: 'Page' },
    { label: 'Email Accounts', href: '/email', type: 'Page' },
    { label: 'Communication', href: '/communication', type: 'Page' },
    { label: 'Cloudflare', href: '/cloudflare', type: 'Page' },
    { label: 'Service Requests', href: '/requests', type: 'Page' },
    { label: 'Billing', href: '/billing', type: 'Page' },
    { label: 'Marketplace', href: '/marketplace', type: 'Page' },
    { label: 'Users', href: '/users', type: 'Page' },
    { label: 'Services', href: '/services', type: 'Page' },
    { label: 'Security', href: '/security', type: 'Page' },
    { label: 'White Label', href: '/white-label', type: 'Page' },
    { label: 'Platform Settings', href: '/platform', type: 'Page' },
    { label: 'Panel Settings', href: '/settings', type: 'Page' },
    { label: 'API Keys', href: '/apikeys', type: 'Page' },
    { label: 'API Usage', href: '/apikeys/usage', type: 'Page' },
    { label: 'LeaxPanel Doctor', href: '/doctor', type: 'Page' },
    { label: 'Setup Wizard', href: '/setup', type: 'Page' },
    { label: 'Notifications', href: '/notifications', type: 'Page' },
    { label: 'My Profile', href: '/profile', type: 'Page' },
    { label: 'Roles & Permissions', href: '/users/roles', type: 'Page' },
    { label: 'Audit Log', href: '/security/audit', type: 'Page' },
    { label: 'Create Website', href: '/website/create', type: 'Action' },
    { label: 'Create Application', href: '/apps/create', type: 'Action' },
    { label: 'Create AI Agent', href: '/ai/create', type: 'Action' },
    { label: 'Create Database', href: '/databases/create', type: 'Action' },
    { label: 'Create Workflow', href: '/n8n/create', type: 'Action' },
    { label: 'Create Backup', href: '/backups/create', type: 'Action' },
    { label: 'Create Domain', href: '/domains/create', type: 'Action' },
    { label: 'Create Bot', href: '/bots/create', type: 'Action' },
    { label: 'Create User', href: '/users/create', type: 'Action' },
    { label: 'Create Service', href: '/services/create', type: 'Action' },
    { label: 'Create Discord Bot', href: '/discord/create', type: 'Action' },
    { label: 'Create Telegram Bot', href: '/telegram/create', type: 'Action' },
    { label: 'Create WhatsApp Instance', href: '/whatsapp/create', type: 'Action' },
    { label: 'Create Email Account', href: '/email/create', type: 'Action' },
    { label: 'Create Cloudflare Zone', href: '/cloudflare/create', type: 'Action' },
    { label: 'Create Storage Bucket', href: '/storage/create', type: 'Action' },
    { label: 'Create Communication Channel', href: '/communication/create', type: 'Action' },
    { label: 'Create AI Hosting Instance', href: '/ai-hosting/create', type: 'Action' },
    { label: 'Create Marketplace Item', href: '/marketplace/create', type: 'Action' },
    { label: 'Create Service Request', href: '/requests/create', type: 'Action' }
  ];

  function renderSearch(query) {
    const box = $('#searchResults');
    if (!box) return;

    const q = (query || '').trim().toLowerCase();
    if (!q) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    const hits = SEARCH_INDEX.filter(item => item.label.toLowerCase().indexOf(q) !== -1).slice(0, 10);

    if (!hits.length) {
      box.innerHTML = '<div class="dropdown-empty">No matches for &ldquo;' + escapeHtml(query) + '&rdquo;</div>';
      box.hidden = false;
      return;
    }

    box.innerHTML = hits.map(item =>
      '<a class="search-result" href="' + escapeHtml(item.href) + '">' +
      escapeHtml(item.label) +
      '<span class="sr-type">' + escapeHtml(item.type) + '</span></a>'
    ).join('');
    box.hidden = false;
  }

  function initSearch() {
    const input = $('#globalSearch');
    if (!input) return;

    const box = $('#searchResults');

    input.addEventListener('input', debounce(() => renderSearch(input.value), 140));
    input.addEventListener('focus', () => { if (input.value) renderSearch(input.value); });

    document.addEventListener('click', (e) => {
      if (box && !box.contains(e.target) && e.target !== input) {
        box.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        if (box) box.hidden = true;
        input.blur();
      }
    });
  }

  /* ---------------------------------------------------------- quick create */
  const QUICK_CREATE = [
    { label: 'Website', desc: 'Deploy a static or dynamic site', href: '/website/create', icon: '🌐' },
    { label: 'Application', desc: 'NodeJS, PHP or Docker app', href: '/apps/create', icon: '📦' },
    { label: 'AI Agent', desc: 'DevOps, support or custom agent', href: '/ai/create', icon: '🤖' },
    { label: 'Database', desc: 'PostgreSQL, MySQL, MongoDB', href: '/databases/create', icon: '🗄️' },
    { label: 'Workflow', desc: 'N8N automation workflow', href: '/n8n/create', icon: '🔄' },
    { label: 'Domain', desc: 'Add a domain and manage DNS', href: '/domains/create', icon: '🌍' },
    { label: 'Bot', desc: 'Telegram, Discord or WhatsApp', href: '/bots/create', icon: '🎮' },
    { label: 'Backup', desc: 'Snapshot your resources', href: '/backups/create', icon: '💾' },
    { label: 'User', desc: 'Invite a new panel user', href: '/users/create', icon: '👤' },
    { label: 'Service', desc: 'Register a managed service', href: '/services/create', icon: '⚙️' },
    { label: 'Discord Bot', desc: 'Deploy a Discord bot', href: '/discord/create', icon: '🎮' },
    { label: 'Telegram Bot', desc: 'Deploy a Telegram bot', href: '/telegram/create', icon: '✈️' },
    { label: 'WhatsApp', desc: 'Connect a WhatsApp instance', href: '/whatsapp/create', icon: '📱' },
    { label: 'Email Account', desc: 'Add a mailbox or alias', href: '/email/create', icon: '📧' },
    { label: 'Domain', desc: 'Add a domain and manage DNS', href: '/domains/create', icon: '🌍' }
  ];

  function buildQuickCreate() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'quickCreateModal';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Quick create">' +
        '<div class="modal-header">' +
          '<span class="modal-title">Quick Create</span>' +
          '<button class="modal-close" type="button" data-close>&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group" style="margin-bottom:16px">' +
            '<input class="form-control" type="search" id="qcSearch" placeholder="Search what you want to create...">' +
          '</div>' +
          '<div class="feature-grid" id="qcGrid"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const grid = $('#qcGrid', overlay);
    const search = $('#qcSearch', overlay);

    function paint(list) {
      grid.innerHTML = list.map(item =>
        '<a class="feature-card" style="padding:14px;text-decoration:none" href="' + escapeHtml(item.href) + '">' +
          '<div style="font-size:22px;margin-bottom:6px">' + item.icon + '</div>' +
          '<h3 style="font-size:13.5px;margin-bottom:2px">' + escapeHtml(item.label) + '</h3>' +
          '<p style="font-size:11.5px;margin:0">' + escapeHtml(item.desc) + '</p>' +
        '</a>'
      ).join('') || '<div class="dropdown-empty" style="grid-column:1/-1">No options found</div>';
    }

    paint(QUICK_CREATE);

    search.addEventListener('input', debounce(() => {
      const q = search.value.trim().toLowerCase();
      paint(q ? QUICK_CREATE.filter(i => i.label.toLowerCase().indexOf(q) !== -1) : QUICK_CREATE);
    }, 120));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close]')) {
        overlay.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) overlay.hidden = true;
    });

    const btn = $('#quickCreateBtn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.hidden = false;
        search.value = '';
        paint(QUICK_CREATE);
        setTimeout(() => search.focus(), 40);
      });
    }
  }

  /* ----------------------------------------------------------------- tabs */
  function initTabs() {
    $$('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab-target');
        const group = btn.closest('[data-tab-group]') || document;
        $$('[data-tab-target]', group).forEach(b => b.classList.remove('active'));
        $$('.tab-pane', group).forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(target);
        if (pane) pane.classList.add('active');
      });
    });
  }

  /* --------------------------------------------------------------- tables */
  function initTables() {
    // Select-all checkbox
    $$('[data-table-select-all]').forEach(master => {
      const table = master.closest('table');
      if (!table) return;
      master.addEventListener('change', () => {
        $$('tbody input[type="checkbox"]', table).forEach(cb => {
          cb.checked = master.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });

    // Row selection highlight
    $$('tbody input[type="checkbox"][data-row-check]').forEach(cb => {
      cb.addEventListener('change', () => {
        const row = cb.closest('tr');
        if (row) row.style.background = cb.checked ? 'var(--primary-soft)' : '';
      });
    });

    // Confirm destructive actions
    $$('form[data-confirm]').forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!window.confirm(form.getAttribute('data-confirm'))) {
          e.preventDefault();
        }
      });
    });
  }

  /* --------------------------------------------------------------- forms */
  function initForms() {
    $$('form[data-loading]').forEach(form => {
      form.addEventListener('submit', () => {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = true;
        if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
        btn.textContent = 'Working…';
      });
    });

    // Auto-dismiss flash alerts
    $$('.alert').forEach(alert => {
      setTimeout(() => {
        alert.style.transition = 'opacity 240ms ease, transform 240ms ease';
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-6px)';
        setTimeout(() => alert.remove(), 260);
      }, 6000);
    });
  }

  /* ------------------------------------------------------------- socket.io */
  function initSocket() {
    if (typeof io === 'undefined') return;
    try {
      const socket = io();
      socket.on('notification', (data) => {
        const msg = (data && (data.message || data.title)) || 'Update';
        toast(msg, (data && data.type) || 'info');
      });
      socket.on('connect_error', () => { /* keep quiet, polling falls back */ });
    } catch (e) { /* socket.io not loaded */ }
  }

  /* ----------------------------------------------------------- command palette */
  function initCommandPalette() {
    const overlay = $('#commandPaletteOverlay');
    const palette = $('#commandPalette');
    const input = $('#commandPaletteInput');
    const sections = $('#commandPaletteSections');
    const empty = $('#commandPaletteEmpty');
    if (!overlay || !palette || !input || !sections) return;

    const CATEGORIES = [
      { id: 'pages', label: 'Pages & Navigation', icon: '📄' },
      { id: 'actions', label: 'Quick Actions', icon: '⚡' },
      { id: 'create', label: 'Create Resources', icon: '➕' },
      { id: 'settings', label: 'Settings & Admin', icon: '⚙️' }
    ];

    const COMMANDS = [
      // Pages
      { cat: 'pages', label: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { cat: 'pages', label: 'Services Dashboard', href: '/services', icon: '⚡' },
      { cat: 'pages', label: 'File Manager', href: '/file-manager', icon: '📁' },
      { cat: 'pages', label: 'Terminal Center', href: '/terminal', icon: '💻' },
      { cat: 'pages', label: 'Marketplace', href: '/marketplace', icon: '🛒' },
      { cat: 'pages', label: 'Doctor', href: '/doctor', icon: '🩺' },
      { cat: 'pages', label: 'AI Agents', href: '/ai', icon: '🤖' },
      { cat: 'pages', label: 'AI Providers', href: '/ai-settings', icon: '🔌' },
      { cat: 'pages', label: 'API Keys', href: '/apikeys', icon: '🔑' },
      { cat: 'pages', label: 'Audit Logs', href: '/security/audit', icon: '📋' },
      { cat: 'pages', label: 'Security Alerts', href: '/security-alerts', icon: '⚠️' },
      { cat: 'pages', label: 'Login Page', href: '/login-page', icon: '🔐' },
      { cat: 'pages', label: 'Profile', href: '/profile', icon: '👤' },
      { cat: 'pages', label: 'Settings', href: '/settings', icon: '⚙️' },

      // Quick actions
      { cat: 'actions', label: 'Quick Create', action: 'quickCreate', icon: '⚡' },
      { cat: 'actions', label: 'Theme Toggle', action: 'toggleTheme', icon: '🎨' },
      { cat: 'actions', label: 'Notifications', action: 'notifications', icon: '𔔾' },

      // Create resources
      { cat: 'create', label: 'Create Website', href: '/website/create', icon: '🌐' },
      { cat: 'create', label: 'Create WordPress', href: '/apps/create?type=wordpress', icon: '📝' },
      { cat: 'create', label: 'Create NodeJS App', href: '/apps/create?type=nodejs', icon: '📦' },
      { cat: 'create', label: 'Create PHP App', href: '/apps/create?type=php', icon: '🐘' },
      { cat: 'create', label: 'Create Telegram Bot', href: '/telegram/create', icon: '✈️' },
      { cat: 'create', label: 'Create Discord Bot', href: '/discord/create', icon: '🎮' },
      { cat: 'create', label: 'Create WhatsApp Instance', href: '/whatsapp/create', icon: '📱' },
      { cat: 'create', label: 'Create AI Agent', href: '/ai/create', icon: '🤖' },
      { cat: 'create', label: 'Create Database', href: '/databases/create', icon: '🗄️' },
      { cat: 'create', label: 'Create Domain', href: '/domains/create', icon: '🌍' },
      { cat: 'create', label: 'Create Backup', href: '/backups/create', icon: '💾' },

      // Settings / admin
      { cat: 'settings', label: 'AI Hosting', href: '/ai-hosting', icon: '🔌' },
      { cat: 'settings', label: 'API Usage', href: '/apikeys/usage', icon: '📊' },
      { cat: 'settings', label: 'API Endpoints', href: '/api-endpoints', icon: '🔌' },
      { cat: 'settings', label: 'Webhooks', href: '/webhooks', icon: '🔗' },
      { cat: 'settings', label: 'Terminal Permissions', href: '/terminal-permissions', icon: '🔒' },
      { cat: 'settings', label: 'Terminal History', href: '/terminal-history', icon: '🕒' },
      { cat: 'settings', label: 'Login Overrides', href: '/login-overrides', icon: '🔓' },
      { cat: 'settings', label: 'Users', href: '/users', icon: '👥' },
      { cat: 'settings', label: 'White Label', href: '/white-label', icon: '🎨' },
      { cat: 'settings', label: 'Platform', href: '/platform', icon: '🖥️' },
      { cat: 'settings', label: 'Doctor', href: '/doctor', icon: '🩺' }
    ];

    let currentIndex = -1;
    let highlighted = null;

    function renderCommands(query) {
      const q = (query || '').trim().toLowerCase();
      const filtered = q ? COMMANDS.filter(c => c.label.toLowerCase().indexOf(q) !== -1) : COMMANDS;

      const byCat = {};
      CATEGORIES.forEach(c => { byCat[c.id] = []; });
      filtered.forEach(c => { if (byCat[c.cat]) byCat[c.cat].push(c); });

      let html = '';
      let hasResults = false;
      CATEGORIES.forEach(cat => {
        if (!byCat[cat.id].length) return;
        hasResults = true;
        html += '<div class="command-category">' +
          '<div class="command-category-label">' + escapeHtml(cat.label) + ' <span class="command-category-icon">' + cat.icon + '</span></div>' +
          '<div class="command-list">' +
          byCat[cat.id].map((cmd, i) => {
            const idx = html.length + i; // approximate, not used for actual index
            return '<a class="command-item' + (i === 0 && !highlighted ? ' command-item-active' : '') + '" ' +
              'href="' + escapeHtml(cmd.href || '') + '" ' +
              'data-action="' + escapeHtml(cmd.action || '') + '" ' +
              'class="command-item">' +
              '<span class="command-item-icon">' + escapeHtml(cmd.icon) + '</span>' +
              '<span class="command-item-label">' + escapeHtml(cmd.label) + '</span>' +
              '<span class="command-item-hint">' + escapeHtml(cmd.href || cmd.action || '') + '</span>' +
              '</a>';
          }).join('') +
          '</div></div>';
      });

      empty.hidden = hasResults || !q;
      sections.innerHTML = html;
      currentIndex = -1;
      highlighted = null;
      updateHighlight();
    }

    function updateHighlight() {
      $$('.command-item', sections).forEach((el, i) => {
        el.classList.toggle('command-item-active', i === currentIndex);
      });
      if (currentIndex >= 0) {
        const active = $$('.command-item', sections)[currentIndex];
        if (active) active.scrollIntoView({ block: 'nearest' });
      }
    }

    function activateItem(index) {
      const items = $$('.command-item', sections);
      if (!items.length) return;
      const item = items[index];
      if (!item) return;
      const action = item.getAttribute('data-action');
      const href = item.getAttribute('href');
      closePalette();
      if (action === 'quickCreate') {
        const btn = $('#quickCreateBtn');
        if (btn) btn.click();
      } else if (action === 'toggleTheme') {
        const toggle = $('#themeToggle');
        if (toggle) toggle.click();
      } else if (action === 'notifications') {
        const btn = $('#notificationBtn');
        if (btn) btn.click();
      } else if (href) {
        window.location.href = href;
      }
    }

    function openPalette() {
      overlay.hidden = false;
      palette.hidden = false;
      input.value = '';
      renderCommands('');
      setTimeout(() => input.focus(), 40);
    }

    function closePalette() {
      overlay.hidden = true;
      palette.hidden = true;
      input.blur();
      currentIndex = -1;
      highlighted = null;
      sections.innerHTML = '';
    }

    input.addEventListener('input', debounce(() => {
      renderCommands(input.value);
    }, 120));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closePalette(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); currentIndex = Math.min(currentIndex + 1, $$('.command-item', sections).length - 1); updateHighlight(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); currentIndex = Math.max(currentIndex - 1, 0); updateHighlight(); }
      if (e.key === 'Enter') { e.preventDefault(); activateItem(currentIndex); }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.hidden) openPalette(); else closePalette();
      }
    });
  }

  /* ---------------------------------------------------------- switch workspace */
  function switchWorkspace(workspaceId) {
    const btn = document.querySelector('.workspace-item[data-workspace-id="' + workspaceId + '"]');
    if (btn) {
      document.querySelectorAll('.workspace-item').forEach(function(el) {
        el.classList.remove('active');
      });
      btn.classList.add('active');
    }
    fetch('/workspaces/' + workspaceId + '/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(res) {
      if (res.ok) {
        window.location.reload();
      } else {
        toast('Failed to switch workspace', 'error');
      }
    }).catch(function() {
      toast('Failed to switch workspace', 'error');
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    initTheme();
    initSidebar();
    initDropdowns();
    initSearch();
    initTabs();
    initTables();
    initForms();
    initSocket();
    buildQuickCreate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
