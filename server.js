require('dotenv').config();

const express = require('express');
const os = require('os');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const morgan = require('morgan');
const compression = require('compression');
const expressLayouts = require('express-ejs-layouts');
const csrf = require('csurf');

const db = require('./config/db');
const security = require('./config/security');
const SQLiteSessionStore = require('./config/sessionStore');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const moduleRoutes = require('./routes/modules');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');
const backupRoutes = require('./routes/backups');
const billingRoutes = require('./routes/billing');
const securityRoutes = require('./routes/security');
const monitoringRoutes = require('./routes/monitoring');
const fileManagerRoutes = require('./routes/fileManager');
const aiSettingsRoutes = require('./routes/aiSettings');
const apiKeyRoutes = require('./routes/apiKeys');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const profileRoutes = require('./routes/profile');
const setupRoutes = require('./routes/setup');
const doctorRoutes = require('./routes/doctor');
const cloudflareRoutes = require('./routes/cloudflare');
const workspaceRoutes = require('./routes/workspaces');
const terminalRoutes = require('./routes/terminal');

const authMiddleware = require('./middleware/auth');
const rbacMiddleware = require('./middleware/rbac');
const auditMiddleware = require('./middleware/audit');
const workspaceMiddleware = require('./middleware/workspace');

const { initSocket } = require('./config/socket');
const monitoringService = require('./services/monitoringService');
const autoHealingService = require('./services/autoHealingService');
const backupService = require('./services/backupService');
const discordService = require('./services/discordService');
const panelSettings = require('./services/panelSettingsService');
const { timeAgo } = require('./utils/helpers');
const logger = require('./utils/logger');

const app = express();

const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_VERSION = require('./package.json').version;

app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.set('layout extractScripts', false);
app.set('layout extractStyles', false);

/* --------------------------------------------------------------- security */
app.use(require('helmet')(security.helmetOptions));
app.use(compression());
app.use(require('cors')(security.corsOptions()));

/* ----------------------------------------------------------------- rate limit */
app.use(security.generalLimiter);
app.use('/api/', security.apiLimiter);
app.use('/login', security.authLimiter);
app.use('/register', security.authLimiter);
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

/* ---------------------------------------------------------------- session */
const sessionStore = new SQLiteSessionStore({
  ttl: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10)
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'leaxos-development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    // 'auto' sets the Secure flag only when the request arrived over HTTPS,
    // so the panel still works on http://localhost:3000 in production mode.
    secure: 'auto',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
    sameSite: 'lax'
  },
  name: 'leaxos.sid'
}));

app.use(flash());

/* ------------------------------------------------------------------ CSRF */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return csrf({ cookie: true })(req, res, next);
});

/* ------------------------------------------------------- global variables */
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.errors = req.flash('errors');
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.currentPath = req.path;
  res.locals.appVersion = APP_VERSION;
  res.locals.panelSettings = panelSettings.all();
  res.locals.pendingRequests = 0;
  res.locals.unreadNotifications = 0;
  res.locals.notifications = [];
  res.locals.appUserPermissions = [];

  if (req.session.user) {
    const role = req.session.user.role || 'viewer';
    res.locals.appUserPermissions = rbacMiddleware.getRolePermissions(role);
    try {
      const pending = db.get("SELECT COUNT(*) AS count FROM requests WHERE status IN ('open','in_progress')");
      res.locals.pendingRequests = pending ? pending.count : 0;
    } catch (err) { /* table may not exist yet */ }
    try {
      const unread = db.get('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [req.session.user.id]);
      res.locals.unreadNotifications = unread ? unread.count : 0;
      res.locals.notifications = db.all(
        'SELECT id, title, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 6',
        [req.session.user.id]
      ).map(n => ({ ...n, timeAgo: timeAgo(n.created_at), link: '/notifications' }));
    } catch (err) { /* table may not exist yet */ }
  }

  next();
});

  /* ------------------------------------------------------------- public page */
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() });
  });

  /* ------------------------------------------------------- workspace context */
  app.use(authMiddleware.requireAuth, workspaceMiddleware.workspaceContext);

  /* ---------------------------------------------------------- layout engine */
  app.use(expressLayouts);

  /* ---------------------------------------------------------------- audit */
  app.use(auditMiddleware.auditMiddleware);

  /* ------------------------------------------------------------ static files */
  const staticMaxAge = process.env.NODE_ENV === 'production' ? '1h' : 0;
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: staticMaxAge, etag: true }));

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('home', {
    title: 'LeaxPanel - Host Anything. Manage Everything. Deploy Anywhere.',
    layout: false,
    user: null
  });
});

/* ------------------------------------------------------------------ routes */
app.use('/', authRoutes);
app.use('/api', apiRoutes);
app.use('/dashboard', authMiddleware.requireAuth, dashboardRoutes);
app.use('/templates', authMiddleware.requireAuth, templateRoutes);
app.use('/users', authMiddleware.requireAuth, rbacMiddleware.checkPermission('users:view'), userRoutes);
app.use('/backups', authMiddleware.requireAuth, rbacMiddleware.checkPermission('backups:view'), backupRoutes);
app.use('/billing', authMiddleware.requireAuth, rbacMiddleware.checkPermission('billing:view'), billingRoutes);
app.use('/security', authMiddleware.requireAuth, rbacMiddleware.checkPermission('security:view'), securityRoutes);
app.use('/monitoring', authMiddleware.requireAuth, rbacMiddleware.checkPermission('monitoring:view'), monitoringRoutes);
app.use('/file-manager', authMiddleware.requireAuth, rbacMiddleware.checkPermission('filemanager:view'), fileManagerRoutes);
app.use('/ai-settings', authMiddleware.requireAuth, rbacMiddleware.checkPermission('ai:view'), aiSettingsRoutes);
app.use('/apikeys', authMiddleware.requireAuth, rbacMiddleware.checkPermission('apikeys:view'), apiKeyRoutes);
app.use('/notifications', authMiddleware.requireAuth, notificationRoutes);
app.use('/settings', authMiddleware.requireAuth, rbacMiddleware.checkPermission('settings:view'), settingsRoutes);
app.use('/profile', authMiddleware.requireAuth, profileRoutes);
app.use('/terminal', authMiddleware.requireAuth, rbacMiddleware.checkPermission('terminal:view'), terminalRoutes);
app.use('/setup', setupRoutes);
app.use('/doctor', authMiddleware.requireAuth, rbacMiddleware.checkPermission('doctor:view'), doctorRoutes);

// Security Alerts
const securityAlertsRoutes = require('./routes/securityAlerts');
app.use('/security-alerts', authMiddleware.requireAuth, rbacMiddleware.checkPermission('security:view'), securityAlertsRoutes);

// Cloudflare management
app.use('/cloudflare', cloudflareRoutes);

// Workspace management
app.use('/workspaces', authMiddleware.requireAuth, workspaceRoutes);

// Declarative module routers (apps, domains, databases, bots, ...)
app.use('/', authMiddleware.requireAuth, moduleRoutes);

/* -------------------------------------------------------------- 404 handler */
app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/api/')) {
    return res.json({ error: 'Endpoint not found', path: req.path });
  }
  res.render('errors/404', {
    title: 'Page Not Found',
    pageTitle: '404',
    user: req.session.user || null
  });
});

/* ------------------------------------------------------------ error handler */
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  discordService.logError(err, {
    path: req.path,
    method: req.method,
    user: req.session && req.session.user ? req.session.user.email : null
  }).catch(() => {});

  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Your session expired. Please try again.');
    return res.redirect(req.get('referer') || '/dashboard');
  }

  res.status(err.status || 500);
  if (req.path.startsWith('/api/')) {
    return res.json({ error: err.message || 'Internal server error' });
  }
  res.render('errors/500', {
    title: 'Server Error',
    pageTitle: '500',
    errorMessage: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    user: req.session.user || null
  });
});

/* ------------------------------------------------------------------ startup */
let currentServer = null;
let currentIo = null;

function createServerInstance() {
  const srv = http.createServer(app);
  const ioInstance = new Server(srv, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });
  app.set('io', ioInstance);
  initSocket(ioInstance);
  return { server: srv, io: ioInstance };
}

/**
 * Auto-detect the best host address to bind to.
 * Prefers explicit HOST env var, then falls back to 0.0.0.0 so the panel
 * is reachable from external devices on Ubuntu / cloud VMs.
 */
function resolveHost() {
  const explicitHost = process.env.HOST;
  if (explicitHost && explicitHost !== '0.0.0.0' && explicitHost !== '::') {
    return explicitHost;
  }

  // Detect non-loopback IPv4 addresses (external interfaces)
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name] || [];
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('127.')) {
        return '0.0.0.0'; // bind to all interfaces so external access works
      }
    }
  }

  return '0.0.0.0'; // default: bind all interfaces
}

function start(port = PORT, retries = 10) {
  try {
    db.get('SELECT 1 AS ok');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.warn('Database not available - run "npm run migrate && npm run seed"');
  }

  if (currentServer) {
    try { currentServer.close(); } catch (e) { /* ignore */ }
  }

  const { server, io: ioInstance } = createServerInstance();
  currentServer = server;
  currentIo = ioInstance;

  monitoringService.stop();
  monitoringService.start();
  autoHealingService.stop();
  autoHealingService.start();
  backupService.stop();
  backupService.start();

  discordService.logSystemEvent('Server Started', {
    port: port,
    environment: process.env.NODE_ENV || 'development',
    version: APP_VERSION
  }).catch(() => {});

  const boundHost = resolveHost();

  server.listen(port, boundHost, () => {
    logger.info(`LeaxPanel(os) v${APP_VERSION} running on http://${boundHost}:${port}`);
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      const nextPort = port + 1;
      logger.warn(`Port ${port} is in use, retrying on port ${nextPort} (${retries} attempts left)...`);
      setTimeout(() => start(nextPort, retries - 1), 1000);
    } else {
      logger.error(`Failed to start server on port ${port}: ${err.message}`);
      process.exit(1);
    }
  });
}

start();

module.exports = { app, server: currentServer, io: currentIo };
