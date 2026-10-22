// Terminal Center - xterm.js browser terminal
(function() {
  'use strict';

  let currentTerminal = null;
  let currentSessionId = null;
  let socket = null;
  let fitAddon = null;
  let isConnected = false;

  // DOM elements
  const terminalEl = document.getElementById('terminal');
  const terminalContainer = document.getElementById('terminalContainer');
  const terminalList = document.getElementById('terminalList');
  const emptyState = document.getElementById('emptyState');
  const activeCountEl = document.getElementById('activeCount');
  const currentTerminalTitle = document.getElementById('currentTerminalTitle');
  const currentTerminalPath = document.getElementById('currentTerminalPath');
  const newTerminalBtn = document.getElementById('newTerminalBtn');
  const newTerminalForm = document.getElementById('newTerminalForm');
  const clearTerminalBtn = document.getElementById('clearTerminalBtn');
  const restartTerminalBtn = document.getElementById('restartTerminalBtn');
  const resizeTerminalBtn = document.getElementById('resizeTerminalBtn');
  const closeTerminalBtn = document.getElementById('closeTerminalBtn');

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    loadSessions();
    setupEventListeners();
    await loadTerminalLibrary();
  }

  async function loadTerminalLibrary() {
    // xterm.js is loaded via CDN in layout.ejs
    // Wait for it to be available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.Terminal) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  function setupEventListeners() {
    if (newTerminalBtn) {
      newTerminalBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('newTerminalModal'));
        modal.show();
      });
    }

    if (newTerminalForm) {
      newTerminalForm.addEventListener('submit', handleNewTerminal);
    }

    if (clearTerminalBtn) {
      clearTerminalBtn.addEventListener('click', () => {
        if (currentTerminal) currentTerminal.clear();
      });
    }

    if (restartTerminalBtn) {
      restartTerminalBtn.addEventListener('click', restartTerminal);
    }

    if (resizeTerminalBtn) {
      resizeTerminalBtn.addEventListener('click', () => {
        if (fitAddon) fitAddon.fit();
      });
    }

    if (closeTerminalBtn) {
      closeTerminalBtn.addEventListener('click', closeTerminal);
    }
  }

  async function loadSessions() {
    try {
      const response = await fetch('/terminal/history');
      const data = await response.json();
      if (data.success) {
        renderSessionList(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  function renderSessionList(sessions) {
    if (!terminalList) return;

    const active = sessions.filter(s => s.status === 'active');
    const completed = sessions.filter(s => s.status !== 'active');

    if (activeCountEl) activeCountEl.textContent = `${active.length} active`;

    if (active.length === 0 && completed.length === 0) {
      terminalList.innerHTML = `
        <div class="empty-state" id="emptyState">
          <div class="empty-icon">_</div>
          <h3>No terminal sessions</h3>
          <p>Click "New Terminal" to start a new session in your project workspace</p>
        </div>
      `;
      return;
    }

    let html = '';
    if (active.length > 0) {
      html += '<h6 class="text-muted mb-2">Active Sessions</h6>';
      html += '<div class="list-group mb-4">';
      active.forEach(s => {
        const started = new Date(s.started_at).toLocaleString();
        html += `
          <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-session-id="${s.id}" data-action="connect">
            <div>
              <div class="fw-medium">${escapeHtml(s.name)}</div>
              <small class="text-muted">${escapeHtml(s.path)} · ${escapeHtml(s.shell)}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge badge-success badge-plain">Active</span>
              <small class="text-muted">${started}</small>
            </div>
          </a>
        `;
      });
      html += '</div>';
    }

    if (completed.length > 0) {
      html += '<h6 class="text-muted mb-2">Recent Sessions</h6>';
      html += '<div class="list-group">';
      completed.slice(0, 10).forEach(s => {
        const started = new Date(s.started_at).toLocaleString();
        const statusBadge = getStatusBadge(s.status);
        html += `
          <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-session-id="${s.id}" data-action="view">
            <div>
              <div class="fw-medium">${escapeHtml(s.name)}</div>
              <small class="text-muted">${escapeHtml(s.path)} · ${escapeHtml(s.shell)}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
              ${statusBadge}
              <small class="text-muted">${started}</small>
            </div>
          </a>
        `;
      });
      html += '</div>';
    }

    terminalList.innerHTML = html;

    // Add click handlers
    terminalList.querySelectorAll('[data-action="connect"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        connectToSession(el.dataset.sessionId);
      });
    });

    terminalList.querySelectorAll('[data-action="view"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        viewSessionHistory(el.dataset.sessionId);
      });
    });
  }

  function getStatusBadge(status) {
    const badges = {
      'closed': '<span class="badge badge-secondary badge-plain">Closed</span>',
      'error': '<span class="badge badge-danger badge-plain">Error</span>',
      'killed': '<span class="badge badge-warning badge-plain">Killed</span>'
    };
    return badges[status] || `<span class="badge badge-info badge-plain">${status}</span>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function handleNewTerminal(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';

    try {
      const formData = new FormData(form);
      const response = await fetch('/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      const data = await response.json();
      if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('newTerminalModal')).hide();
        form.reset();
        await connectToSession(data.sessionId);
      } else {
        alert('Failed to create terminal: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  async function connectToSession(sessionId) {
    try {
      const response = await fetch(`/terminal/${sessionId}/output`);
      const data = await response.json();
      if (!data.success) {
        alert('Session not found');
        return;
      }

      currentSessionId = sessionId;
      showTerminalContainer(data.session);
      initTerminal(data.session);
      connectSocket(sessionId);
    } catch (err) {
      console.error('Connect error:', err);
      alert('Failed to connect: ' + err.message);
    }
  }

  function showTerminalContainer(session) {
    if (emptyState) emptyState.style.display = 'none';
    if (terminalContainer) terminalContainer.style.display = 'flex';
    if (currentTerminalTitle) currentTerminalTitle.textContent = session.name;
    if (currentTerminalPath) currentTerminalPath.textContent = session.path;
  }

  function initTerminal(session) {
    if (currentTerminal) {
      currentTerminal.dispose();
    }

    // Create xterm instance
    currentTerminal = new Terminal({
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.3,
      theme: {
        background: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg').trim() || '#1e1e2e',
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-color').trim() || '#cdd6f4',
        cursor: getComputedStyle(document.documentElement).getPropertyValue('--bs-primary').trim() || '#89b4fa',
        selection: 'rgba(137, 180, 250, 0.3)',
        black: '#1e1e2e',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#6c7086',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8'
      },
      convertEol: true,
      allowTransparency: true,
      tabStopWidth: 4
    });

    // Load fit addon
    if (window.FitAddon) {
      fitAddon = new FitAddon.FitAddon();
      currentTerminal.loadAddon(fitAddon);
    }

    // Load webgl addon for better performance
    if (window.WebglAddon) {
      const webglAddon = new WebglAddon.WebglAddon();
      currentTerminal.loadAddon(webglAddon);
    }

    // Open terminal in container
    currentTerminal.open(terminalEl);

    // Fit to container
    setTimeout(() => {
      if (fitAddon) fitAddon.fit();
    }, 100);

    // Handle resize
    window.addEventListener('resize', () => {
      if (fitAddon) fitAddon.fit();
    });

    // Send input to server
    currentTerminal.onData((data) => {
      if (socket && socket.connected) {
        socket.emit('terminal:input', { sessionId: currentSessionId, data });
      }
    });

    // Handle terminal resize
    currentTerminal.onResize(({ cols, rows }) => {
      if (socket && socket.connected) {
        socket.emit('terminal:resize', { sessionId: currentSessionId, cols, rows });
      }
    });

    // Focus terminal
    currentTerminal.focus();
  }

  function connectSocket(sessionId) {
    // Get socket.io from global or create connection
    if (typeof io !== 'undefined') {
      socket = io({
        auth: { token: localStorage.getItem('authToken') || '' },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        isConnected = true;
          // Join terminal room via new event
          socket.emit('terminal:join', { sessionId });
        });

        socket.on('terminal:connected', (data) => {
          if (data.sessionId === currentSessionId) {
            // Terminal is ready
            console.log('Terminal connected:', data);
          }
        });

        socket.on('terminal:output', (data) => {
          if (currentTerminal && data.sessionId === currentSessionId) {
            currentTerminal.write(data.output);
          }
        });

        socket.on('terminal:exit', (data) => {
          if (data.sessionId === currentSessionId) {
            handleTerminalExit(data);
          }
        });

        socket.on('terminal:close', (data) => {
          if (data.sessionId === currentSessionId) {
            closeTerminal(false);
          }
        });

        socket.on('disconnect', () => {
          isConnected = false;
        });
      } else {
        console.warn('Socket.IO not available, terminal will not work');
      }
    }

  function handleTerminalExit(data) {
    if (data.exitCode !== undefined) {
      currentTerminal.write(`\r\n[Process exited with code ${data.exitCode}]\r\n`);
    }
    setTimeout(() => {
      closeTerminal();
    }, 2000);
  }

  function restartTerminal() {
    if (!currentSessionId) return;
    closeTerminal(false);
    setTimeout(() => connectToSession(currentSessionId), 500);
  }

  function closeTerminal(removeSession = true) {
    if (currentTerminal) {
      currentTerminal.dispose();
      currentTerminal = null;
      fitAddon = null;
    }

    if (socket) {
      if (removeSession && currentSessionId) {
        socket.emit('terminal:close', { sessionId: currentSessionId });
      }
      socket.disconnect();
      socket = null;
    }

    if (terminalContainer) terminalContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    currentSessionId = null;
    isConnected = false;

    loadSessions();
  }

  async function viewSessionHistory(sessionId) {
    // TODO: Load audit logs for this session
    const modal = new bootstrap.Modal(document.getElementById('sessionHistoryModal'));
    modal.show();
  }

  // Expose for global access
  window.TerminalCenter = {
    connect: connectToSession,
    close: closeTerminal,
    restart: restartTerminal
  };
})();