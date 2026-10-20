require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');

const pool = require('./config/database');
const redisClient = require('./config/redis');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const aiRoutes = require('./routes/ai');
const monitoringRoutes = require('./routes/monitoring');
const backupRoutes = require('./routes/backups');
const securityRoutes = require('./routes/security');
const billingRoutes = require('./routes/billing');
const domainRoutes = require('./routes/domains');
const databaseRoutes = require('./routes/databases');
const storageRoutes = require('./routes/storage');
const communicationRoutes = require('./routes/communication');
const fileManagerRoutes = require('./routes/fileManager');
const whatsappRoutes = require('./routes/whatsapp');
const discordRoutes = require('./routes/discord');
const telegramRoutes = require('./routes/telegram');
const n8nRoutes = require('./routes/n8n');
const emailRoutes = require('./routes/email');
const cloudflareRoutes = require('./routes/cloudflare');
const aiHostingRoutes = require('./routes/aiHosting');
const marketplaceRoutes = require('./routes/marketplace');
const platformRoutes = require('./routes/platform');
const botRoutes = require('./routes/bots');
const websiteRoutes = require('./routes/website');
const requestRoutes = require('./routes/requests');
const whiteLabelRoutes = require('./routes/whiteLabel');
const authMiddleware = require('./middleware/auth');
const rbacMiddleware = require('./middleware/rbac');
const auditMiddleware = require('./middleware/audit');
const { initSocket } = require('./config/socket');
const monitoringService = require('./services/monitoringService');
const autoHealingService = require('./services/autoHealingService');
const backupService = require('./services/backupService');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Trust proxy
app.set('trust proxy', 1);

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Socket.io instance available in routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session with Redis store (fallback to memory store if Redis unavailable)
let sessionStore;
try {
  const RedisStore = require('connect-redis').default;
  sessionStore = new RedisStore({ client: redisClient });
} catch (e) {
  sessionStore = undefined;
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
    sameSite: 'lax'
  },
  name: 'leaxos.sid'
}));

app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.errors = req.flash('errors');
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

// CSRF protection for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  csrf({ cookie: true })(req, res, next);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes);
app.use('/api', apiRoutes);
app.use('/dashboard', authMiddleware.requireAuth, dashboardRoutes);
app.use('/users', authMiddleware.requireAuth, rbacMiddleware.checkPermission('users:view'), userRoutes);
app.use('/services', authMiddleware.requireAuth, rbacMiddleware.checkPermission('services:view'), serviceRoutes);
app.use('/ai', authMiddleware.requireAuth, rbacMiddleware.checkPermission('ai:view'), aiRoutes);
app.use('/monitoring', authMiddleware.requireAuth, rbacMiddleware.checkPermission('monitoring:view'), monitoringRoutes);
app.use('/backups', authMiddleware.requireAuth, rbacMiddleware.checkPermission('backups:view'), backupRoutes);
app.use('/security', authMiddleware.requireAuth, rbacMiddleware.checkPermission('security:view'), securityRoutes);
app.use('/billing', authMiddleware.requireAuth, rbacMiddleware.checkPermission('billing:view'), billingRoutes);
app.use('/domains', authMiddleware.requireAuth, rbacMiddleware.checkPermission('domains:view'), domainRoutes);
app.use('/databases', authMiddleware.requireAuth, rbacMiddleware.checkPermission('databases:view'), databaseRoutes);
app.use('/storage', authMiddleware.requireAuth, rbacMiddleware.checkPermission('storage:view'), storageRoutes);
app.use('/communication', authMiddleware.requireAuth, rbacMiddleware.checkPermission('communication:view'), communicationRoutes);
app.use('/file-manager', authMiddleware.requireAuth, rbacMiddleware.checkPermission('filemanager:view'), fileManagerRoutes);
app.use('/whatsapp', authMiddleware.requireAuth, rbacMiddleware.checkPermission('whatsapp:view'), whatsappRoutes);
app.use('/discord', authMiddleware.requireAuth, rbacMiddleware.checkPermission('discord:view'), discordRoutes);
app.use('/telegram', authMiddleware.requireAuth, rbacMiddleware.checkPermission('telegram:view'), telegramRoutes);
app.use('/n8n', authMiddleware.requireAuth, rbacMiddleware.checkPermission('n8n:view'), n8nRoutes);
app.use('/email', authMiddleware.requireAuth, rbacMiddleware.checkPermission('email:view'), emailRoutes);
app.use('/cloudflare', authMiddleware.requireAuth, rbacMiddleware.checkPermission('cloudflare:view'), cloudflareRoutes);
app.use('/ai-hosting', authMiddleware.requireAuth, rbacMiddleware.checkPermission('aihosting:view'), aiHostingRoutes);
app.use('/marketplace', authMiddleware.requireAuth, rbacMiddleware.checkPermission('marketplace:view'), marketplaceRoutes);
app.use('/platform', authMiddleware.requireAuth, rbacMiddleware.checkPermission('platform:view'), platformRoutes);
app.use('/bots', authMiddleware.requireAuth, rbacMiddleware.checkPermission('bots:view'), botRoutes);
app.use('/website', authMiddleware.requireAuth, rbacMiddleware.checkPermission('website:view'), websiteRoutes);
app.use('/requests', authMiddleware.requireAuth, rbacMiddleware.checkPermission('requests:view'), requestRoutes);
app.use('/white-label', authMiddleware.requireAuth, rbacMiddleware.checkPermission('whitelabel:view'), whiteLabelRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'CSRF token mismatch. Please try again.');
    return res.redirect('back');
  }
  res.status(500).render('errors/500', { title: 'Server Error' });
});

// Initialize Socket.IO
initSocket(io);

// Initialize services
monitoringService.start();
autoHealingService.start();
backupService.start();

// Database connection and server start
async function start() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.warn('Database not available - running in degraded mode (DB-dependent features will fail)');
  }

  server.listen(PORT, () => {
    logger.info(`LeaxPanel(os) server running on http://${process.env.HOST || '0.0.0.0'}:${PORT}`);
  });
}

start();

module.exports = { app, server, io };