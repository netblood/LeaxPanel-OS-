// Central registry of panel resources.
// Each entry drives: the sidebar link, the CRUD router, the list view and
// the create/edit forms. Keeping everything declarative means adding a
// module is a single object literal.
const { createResourceRouter } = require('../utils/crud');

const STATUS_OPTIONS = ['active', 'inactive', 'pending', 'error', 'maintenance'];

const modules = [];

function defineModule(config) {
  modules.push(config);
  return config;
}

/* ---------------------------------------------------------------- Apps */
defineModule({
  table: 'apps',
  module: 'apps',
  prefix: 'apps',
  perm: 'apps:view',
  title: 'Applications',
  subtitle: 'Deploy and manage NodeJS, PHP and WordPress applications',
  icon: 'box',
  orderBy: 'created_at DESC',
  viewPrefix: 'apps',
  fields: [
    { name: 'name', label: 'Application Name', required: true, maxLength: 120, placeholder: 'my-node-app' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['nodejs', 'php', 'wordpress', 'docker', 'static'] },
    { name: 'runtime', label: 'Runtime / Version', placeholder: 'node 22.x' },
    { name: 'domain', label: 'Domain', placeholder: 'app.example.com' },
    { name: 'root_path', label: 'Root Path', placeholder: '/var/www/app' },
    { name: 'entrypoint', label: 'Entrypoint', placeholder: 'server.js' },
    { name: 'start_command', label: 'Start Command', placeholder: 'npm start' },
    { name: 'install_command', label: 'Install Command', placeholder: 'npm ci --omit=dev' },
    { name: 'build_command', label: 'Build Command', placeholder: 'npm run build' },
    { name: 'port', label: 'Port', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['running', 'stopped', 'deploying', 'error', 'pending'], default: 'pending' },
    { name: 'env_vars', label: 'Environment Variables', type: 'config', help: 'JSON object of KEY=value pairs' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Application', primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'domain', label: 'Domain' },
    { key: 'port', label: 'Port' },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'pending', type: 'nodejs' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('apps', String(rowId), data.name, req.user.id, {
          appType: data.type,
          startCommand: data.start_command,
          installCommand: data.install_command,
          buildCommand: data.build_command,
          entrypoint: data.entrypoint,
          rootPath: data.root_path,
          envVars: data.env_vars,
          preferredPort: data.port
        });
      }
    } catch (err) {
      logger.error('[Apps] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------- Domains */
defineModule({
  table: 'domains',
  module: 'domains',
  prefix: 'domains',
  perm: 'domains:view',
  title: 'Domains & DNS',
  subtitle: 'Manage domains, DNS records and SSL certificates',
  icon: 'globe',
  orderBy: 'created_at DESC',
  viewPrefix: 'domains',
  fields: [
    { name: 'name', label: 'Domain Name', required: true, maxLength: 255, placeholder: 'example.com' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'suspended', 'expired'], default: 'pending' },
    { name: 'dns_records', label: 'DNS Records', type: 'config', help: 'JSON array of records' }
  ],
  columns: [
    { key: 'name', label: 'Domain', primary: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'dns_records', label: 'Records', custom: 'dns' },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'pending' }
});

/* ------------------------------------------------------------ Websites */
defineModule({
  table: 'websites',
  module: 'website',
  prefix: 'website',
  perm: 'website:view',
  title: 'Websites',
  subtitle: 'Host static and dynamic websites',
  icon: 'layout',
  orderBy: 'created_at DESC',
  viewPrefix: 'website',
  fields: [
    { name: 'name', label: 'Website Name', required: true, maxLength: 120 },
    { name: 'domain', label: 'Domain', required: true, maxLength: 255, placeholder: 'www.example.com' },
    { name: 'platform', label: 'Platform', type: 'select', options: ['static', 'nodejs', 'php', 'wordpress', 'proxy'], default: 'static' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Website', primary: true },
    { key: 'domain', label: 'Domain' },
    { key: 'platform', label: 'Platform', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'active', platform: 'static' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('website', String(rowId), data.name, req.user.id, {
          platform: data.platform
        });
      }
    } catch (err) {
      logger.error('[Website] Auto-provision failed:', err);
    }
  }
});

/* ----------------------------------------------------------- Databases */
defineModule({
  table: 'databases',
  module: 'databases',
  prefix: 'databases',
  perm: 'databases:view',
  title: 'Databases',
  subtitle: 'SQLite, PostgreSQL, MongoDB and Redis instances',
  icon: 'database',
  orderBy: 'created_at DESC',
  viewPrefix: 'databases',
  fields: [
    { name: 'name', label: 'Database Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Engine', type: 'select', required: true, options: ['sqlite', 'postgresql', 'mysql', 'mongodb', 'redis'] },
    { name: 'host', label: 'Host', placeholder: '127.0.0.1' },
    { name: 'port', label: 'Port', type: 'number' },
    { name: 'username', label: 'Username' },
    { name: 'password_encrypted', label: 'Password', type: 'password' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' }
  ],
  columns: [
    { key: 'name', label: 'Database', primary: true },
    { key: 'type', label: 'Engine', badge: true },
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'active', type: 'sqlite', host: '127.0.0.1' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('databases', String(rowId), data.name, req.user.id, {
          engine: data.type,
          host: data.host,
          port: data.port
        });
      }
    } catch (err) {
      logger.error('[Databases] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------- Storage */
defineModule({
  table: 'storage_buckets',
  module: 'storage',
  prefix: 'storage',
  perm: 'storage:view',
  title: 'Storage Buckets',
  subtitle: 'Object storage containers for files and media',
  icon: 'harddrive',
  orderBy: 'created_at DESC',
  viewPrefix: 'storage',
  fields: [
    { name: 'name', label: 'Bucket Name', required: true, maxLength: 120 },
    { name: 'region', label: 'Region', placeholder: 'local' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' }
  ],
  columns: [
    { key: 'name', label: 'Bucket', primary: true },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'active', region: 'local' },
  afterSave: async (req, data, rowId) => {
      try {
        const serviceProvisioner = require('../services/serviceProvisioner');
        const panelSettings = require('../services/panelSettingsService');
        const platformDomain = panelSettings.get('platform_domain');
        if (platformDomain) {
          await serviceProvisioner.provision('storage', String(rowId), data.name, req.user.id, {
            region: data.region
          });
        }
      } catch (err) {
        logger.error('[Storage] Auto-provision failed:', err);
      }
    }
  });

/* ------------------------------------------------------- Communication */
defineModule({
  table: 'communication_channels',
  module: 'communication',
  prefix: 'communication',
  perm: 'communication:view',
  title: 'Communication',
  subtitle: 'Email, SMS and webhook delivery channels',
  icon: 'chat',
  orderBy: 'created_at DESC',
  viewPrefix: 'communication',
  fields: [
    { name: 'name', label: 'Channel Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Channel Type', type: 'select', required: true, options: ['email', 'sms', 'webhook', 'push'] },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Channel', primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'active' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('communication', String(rowId), data.name, req.user.id, {
          channelType: data.type
        });
      }
    } catch (err) {
      logger.error('[Communication] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------ WhatsApp */
defineModule({
  table: 'whatsapp_instances',
  module: 'whatsapp',
  prefix: 'whatsapp',
  perm: 'whatsapp:view',
  title: 'WhatsApp',
  subtitle: 'Evolution API, WAHA, Baileys and OpenWA instances',
  icon: 'phone',
  orderBy: 'created_at DESC',
  viewPrefix: 'whatsapp',
  fields: [
    { name: 'name', label: 'Instance Name', required: true, maxLength: 120 },
    { name: 'phone_number', label: 'Phone Number', placeholder: '+212600000000' },
    { name: 'status', label: 'Status', type: 'select', options: ['connected', 'connecting', 'disconnected', 'error'], default: 'disconnected' },
    { name: 'session_data', label: 'Session Data', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Instance', primary: true },
    { key: 'phone_number', label: 'Phone' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'disconnected' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('whatsapp', String(rowId), data.name, req.user.id, {
          phoneNumber: data.phone_number
        });
      }
    } catch (err) {
      logger.error('[WhatsApp] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------- Discord */
defineModule({
  table: 'discord_bots',
  module: 'discord',
  prefix: 'discord',
  perm: 'discord:view',
  title: 'Discord',
  subtitle: 'Discord bot deployments, tokens and sharding',
  icon: 'message',
  orderBy: 'created_at DESC',
  viewPrefix: 'discord',
  fields: [
    { name: 'name', label: 'Bot Name', required: true, maxLength: 120 },
    { name: 'bot_token_encrypted', label: 'Bot Token', type: 'password' },
    { name: 'status', label: 'Status', type: 'select', options: ['running', 'stopped', 'error', 'pending'], default: 'stopped' },
    { name: 'guild_count', label: 'Guilds', type: 'number' }
  ],
  columns: [
    { key: 'name', label: 'Bot', primary: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'guild_count', label: 'Guilds' }
  ],
  defaults: { status: 'stopped', guild_count: 0 },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('discord', String(rowId), data.name, req.user.id, {
          botToken: data.bot_token_encrypted
        });
      }
    } catch (err) {
      logger.error('[Discord] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------ Telegram */
defineModule({
  table: 'telegram_bots',
  module: 'telegram',
  prefix: 'telegram',
  perm: 'telegram:view',
  title: 'Telegram',
  subtitle: 'Telegram bot deployments and webhook management',
  icon: 'send',
  orderBy: 'created_at DESC',
  viewPrefix: 'telegram',
  fields: [
    { name: 'name', label: 'Bot Name', required: true, maxLength: 120 },
    { name: 'username', label: 'Bot Username', placeholder: '@mybot' },
    { name: 'bot_token_encrypted', label: 'Bot Token', type: 'password' },
    { name: 'status', label: 'Status', type: 'select', options: ['running', 'stopped', 'error', 'pending'], default: 'stopped' }
  ],
  columns: [
    { key: 'name', label: 'Bot', primary: true },
    { key: 'username', label: 'Username' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'stopped' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('telegram', String(rowId), data.name, req.user.id, {
          botToken: data.bot_token_encrypted,
          botUsername: data.username
        });
      }
    } catch (err) {
      logger.error('[Telegram] Auto-provision failed:', err);
    }
  }
});

/* ---------------------------------------------------------------- N8N */
defineModule({
  table: 'n8n_workflows',
  module: 'n8n',
  prefix: 'n8n',
  perm: 'n8n:view',
  title: 'N8N Workflows',
  subtitle: 'Automation workflows, executions and credentials',
  icon: 'workflow',
  orderBy: 'created_at DESC',
  viewPrefix: 'n8n',
  fields: [
    { name: 'name', label: 'Workflow Name', required: true, maxLength: 120 },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'error', 'pending'], default: 'inactive' },
    { name: 'workflow_data', label: 'Workflow Definition', type: 'config', help: 'Exported n8n workflow JSON' }
  ],
  columns: [
    { key: 'name', label: 'Workflow', primary: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'inactive', workflow_data: '{}' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('n8n', String(rowId), data.name, req.user.id, {
          workflowData: data.workflow_data
        });
      }
    } catch (err) {
      logger.error('[N8N] Auto-provision failed:', err);
    }
  }
});

/* --------------------------------------------------------------- Email */
defineModule({
  table: 'email_accounts',
  module: 'email',
  prefix: 'email',
  perm: 'email:view',
  title: 'Email',
  subtitle: 'Mailboxes, aliases and SMTP/IMAP configuration',
  icon: 'mail',
  orderBy: 'created_at DESC',
  viewPrefix: 'email',
  fields: [
    { name: 'name', label: 'Account Name', required: true, maxLength: 120 },
    { name: 'email_address', label: 'Email Address', type: 'email', required: true },
    { name: 'provider', label: 'Provider', type: 'select', options: ['smtp', 'imap', 'gmail', 'outlook', 'custom'], default: 'custom' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Account', primary: true },
    { key: 'email_address', label: 'Address' },
    { key: 'provider', label: 'Provider', badge: true },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'active', provider: 'custom' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('email', String(rowId), data.name, req.user.id, {
          emailAddress: data.email_address,
          provider: data.provider
        });
      }
    } catch (err) {
      logger.error('[Email] Auto-provision failed:', err);
    }
  }
});

/* ---------------------------------------------------------- Cloudflare */
defineModule({
  table: 'cloudflare_zones',
  module: 'cloudflare',
  prefix: 'cloudflare',
  perm: 'cloudflare:view',
  title: 'Cloudflare',
  subtitle: 'Zones, DNS, SSL, cache and firewall rules',
  icon: 'shield',
  orderBy: 'created_at DESC',
  viewPrefix: 'cloudflare',
  fields: [
    { name: 'name', label: 'Zone Name', required: true, maxLength: 255 },
    { name: 'zone_id', label: 'Zone ID' },
    { name: 'plan', label: 'Plan', type: 'select', options: ['free', 'pro', 'business', 'enterprise'], default: 'free' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'paused', 'error'], default: 'pending' }
  ],
  columns: [
    { key: 'name', label: 'Zone', primary: true },
    { key: 'zone_id', label: 'Zone ID' },
    { key: 'plan', label: 'Plan', badge: true },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'pending', plan: 'free' }
});

/* --------------------------------------------------------- AI Hosting */
defineModule({
  table: 'ai_hosting_instances',
  module: 'ai-hosting',
  prefix: 'ai-hosting',
  perm: 'aihosting:view',
  title: 'AI Hosting',
  subtitle: 'Hosted model endpoints and inference instances',
  icon: 'server',
  orderBy: 'created_at DESC',
  viewPrefix: 'ai-hosting',
  fields: [
    { name: 'name', label: 'Instance Name', required: true, maxLength: 120 },
    { name: 'model', label: 'Model', placeholder: 'gpt-4o-mini' },
    { name: 'endpoint', label: 'Endpoint', type: 'url' },
    { name: 'api_key_encrypted', label: 'API Key', type: 'password' },
    { name: 'status', label: 'Status', type: 'select', options: ['running', 'stopped', 'error', 'pending'], default: 'pending' }
  ],
  columns: [
    { key: 'name', label: 'Instance', primary: true },
    { key: 'model', label: 'Model' },
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'pending' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('ai-hosting', String(rowId), data.name, req.user.id, {
          model: data.model,
          endpoint: data.endpoint
        });
      }
    } catch (err) {
      logger.error('[AI Hosting] Auto-provision failed:', err);
    }
  }
});

/* --------------------------------------------------------- Marketplace */
defineModule({
  table: 'marketplace_items',
  module: 'marketplace',
  prefix: 'marketplace',
  perm: 'marketplace:view',
  title: 'Marketplace',
  subtitle: 'Templates and services available for deployment',
  icon: 'store',
  orderBy: 'created_at DESC',
  viewPrefix: 'marketplace',
  fields: [
    { name: 'name', label: 'Item Name', required: true, maxLength: 120 },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'category', label: 'Category', type: 'select', options: ['website', 'bot', 'workflow', 'ai', 'database', 'other'], default: 'other' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'currency', label: 'Currency', default: 'USD' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'draft', 'sold', 'archived'], default: 'active' }
  ],
  columns: [
    { key: 'name', label: 'Item', primary: true },
    { key: 'category', label: 'Category', badge: true },
    { key: 'price', label: 'Price', custom: 'price' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'active', currency: 'USD', price: 0, category: 'other' }
});

/* ---------------------------------------------------------- Bots (all) */
defineModule({
  table: 'bots',
  module: 'bots',
  prefix: 'bots',
  perm: 'bots:view',
  title: 'Bots',
  subtitle: 'Unified view of every bot deployment',
  icon: 'bot',
  orderBy: 'created_at DESC',
  viewPrefix: 'bots',
  fields: [
    { name: 'name', label: 'Bot Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Platform', type: 'select', required: true, options: ['telegram', 'discord', 'whatsapp', 'slack', 'custom'] },
    { name: 'status', label: 'Status', type: 'select', options: ['running', 'stopped', 'error', 'pending'], default: 'stopped' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Bot', primary: true },
    { key: 'type', label: 'Platform', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'stopped' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('bots', String(rowId), data.name, req.user.id, {
          botType: data.type
        });
      }
    } catch (err) {
      logger.error('[Bots] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------- AI Agents */
defineModule({
  table: 'ai_agents',
  module: 'ai',
  prefix: 'ai',
  perm: 'ai:view',
  title: 'AI Agents',
  subtitle: 'Support, DevOps, security and custom AI agents',
  icon: 'sparkles',
  orderBy: 'created_at DESC',
  viewPrefix: 'ai',
  fields: [
    { name: 'name', label: 'Agent Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Agent Type', type: 'select', required: true, options: ['support', 'devops', 'security', 'marketing', 'sales', 'coding', 'custom'], default: 'custom' },
    { name: 'model', label: 'Model', placeholder: 'gpt-4o-mini' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'error', 'pending'], default: 'inactive' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Agent', primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'model', label: 'Model' },
    { key: 'status', label: 'Status', status: true }
  ],
  defaults: { status: 'inactive', type: 'custom' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('ai-agents', String(rowId), data.name, req.user.id, {
          agentType: data.type,
          model: data.model
        });
      }
    } catch (err) {
      logger.error('[AI Agents] Auto-provision failed:', err);
    }
  }
});

/* ---------------------------------------------------------- Services */
defineModule({
  table: 'services',
  module: 'services',
  prefix: 'services',
  perm: 'services:view',
  title: 'Services',
  subtitle: 'Managed services registered on the platform',
  icon: 'layers',
  orderBy: 'created_at DESC',
  viewPrefix: 'services',
  fields: [
    { name: 'name', label: 'Service Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Service Type', required: true, placeholder: 'nodejs' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'active' },
    { name: 'config', label: 'Configuration', type: 'config' }
  ],
  columns: [
    { key: 'name', label: 'Service', primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Created', date: true }
  ],
  defaults: { status: 'active' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('services', String(rowId), data.name, req.user.id, {
          serviceType: data.type
        });
      }
    } catch (err) {
      logger.error('[Services] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------------ Requests */
defineModule({
  table: 'requests',
  module: 'requests',
  prefix: 'requests',
  perm: 'requests:view',
  title: 'Service Requests',
  subtitle: 'Customer requests reviewed and assigned by the team',
  icon: 'ticket',
  orderBy: 'created_at DESC',
  viewPrefix: 'requests',
  fields: [
    { name: 'subject', label: 'Subject', required: true, maxLength: 200 },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    { name: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'resolved', 'closed', 'rejected'], default: 'open' }
  ],
  columns: [
    { key: 'subject', label: 'Subject', primary: true },
    { key: 'priority', label: 'Priority', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'created_at', label: 'Submitted', date: true }
  ],
  defaults: { priority: 'normal', status: 'open' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('requests', String(rowId), data.subject, req.user.id, {
          priority: data.priority,
          description: data.description
        });
      }
    } catch (err) {
      logger.error('[Requests] Auto-provision failed:', err);
    }
  }
});

/* --------------------------------------------------------- White Label */
defineModule({
  table: 'white_label_settings',
  module: 'white-label',
  prefix: 'white-label',
  perm: 'whitelabel:view',
  title: 'White Label',
  subtitle: 'Rebrand the panel with your own logo, colors and domain',
  icon: 'palette',
  orderBy: 'key ASC',
  viewPrefix: 'white-label',
  fields: [
    { name: 'key', label: 'Setting Key', required: true, maxLength: 120 },
    { name: 'value', label: 'Value', type: 'textarea' }
  ],
  columns: [
    { key: 'key', label: 'Key', primary: true },
    { key: 'value', label: 'Value' },
    { key: 'updated_at', label: 'Updated', date: true }
  ],
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('white-label', String(rowId), data.key, req.user.id, {
          value: data.value
        });
      }
    } catch (err) {
      logger.error('[White Label] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------ Platform keys */
defineModule({
  table: 'platform_settings',
  module: 'platform',
  prefix: 'platform',
  perm: 'platform:view',
  title: 'Platform Settings',
  subtitle: 'Low level platform configuration keys',
  icon: 'sliders',
  orderBy: 'key ASC',
  viewPrefix: 'platform',
  fields: [
    { name: 'key', label: 'Setting Key', required: true, maxLength: 120 },
    { name: 'value', label: 'Value', type: 'textarea' },
    { name: 'type', label: 'Type', default: 'string' },
    { name: 'description', label: 'Description' }
  ],
  columns: [
    { key: 'key', label: 'Key', primary: true },
    { key: 'value', label: 'Value' },
    { key: 'type', label: 'Type', badge: true },
    { key: 'updated_at', label: 'Updated', date: true }
  ],
  defaults: { type: 'string' },
  afterSave: async (req, data, rowId) => {
    try {
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      if (platformDomain) {
        await serviceProvisioner.provision('platform', String(rowId), data.key, req.user.id, {
          value: data.value,
          type: data.type,
          description: data.description
        });
      }
    } catch (err) {
      logger.error('[Platform] Auto-provision failed:', err);
    }
  }
});

/* ------------------------------------------------------- File Manager */
defineModule({
  table: 'file_manager_files',
  module: 'file-manager',
  prefix: 'file-manager',
  perm: 'filemanager:view',
  title: 'File Manager',
  subtitle: 'Browse, edit and manage project files with Monaco Editor',
  icon: 'folder',
  orderBy: 'updated_at DESC',
  viewPrefix: 'file-manager',
  fields: [
    { name: 'name', label: 'File Name', required: true, maxLength: 255 },
    { name: 'path', label: 'Path', required: true, placeholder: '/src/index.js' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['file', 'directory'], default: 'file' },
    { name: 'project_type', label: 'Project Type', type: 'select', options: ['app', 'website', 'service', 'workspace', 'custom'], default: 'custom' },
    { name: 'project_id', label: 'Project ID', type: 'number' },
    { name: 'workspace_id', label: 'Workspace', type: 'select', options: [], help: 'Leave empty for global files' },
    { name: 'content', label: 'Content', type: 'textarea', help: 'File content (for small files)' },
    { name: 'mime_type', label: 'MIME Type', placeholder: 'text/javascript' },
    { name: 'encoding', label: 'Encoding', default: 'utf-8' },
    { name: 'permissions', label: 'Permissions', default: 'rw-r--r--' },
    { name: 'is_hidden', label: 'Hidden', type: 'checkbox', default: false }
  ],
  columns: [
    { key: 'name', label: 'Name', primary: true },
    { key: 'path', label: 'Path' },
    { key: 'type', label: 'Type', badge: true },
    { key: 'project_type', label: 'Project', badge: true },
    { key: 'size', label: 'Size', custom: 'size' },
    { key: 'updated_at', label: 'Modified', date: true }
  ],
  defaults: { type: 'file', encoding: 'utf-8', permissions: 'rw-r--r--', is_hidden: 0 }
});

/* ------------------------------------------------------- Terminal Center */
defineModule({
  table: 'terminal_sessions',
  module: 'terminal',
  prefix: 'terminal',
  perm: 'terminal:view',
  title: 'Terminal Center',
  subtitle: 'Browser-based terminal with xterm.js',
  icon: 'terminal',
  orderBy: 'started_at DESC',
  viewPrefix: 'terminal',
  fields: [
    { name: 'name', label: 'Session Name', required: true, maxLength: 120, placeholder: 'my-terminal' },
    { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: ['app', 'website', 'service', 'workspace', 'custom'], default: 'workspace' },
    { name: 'project_id', label: 'Project ID', type: 'number' },
    { name: 'workspace_id', label: 'Workspace', type: 'select', options: [] },
    { name: 'shell', label: 'Shell', type: 'select', options: ['bash', 'sh', 'zsh', 'powershell'], default: 'bash' },
    { name: 'cols', label: 'Columns', type: 'number', default: 80 },
    { name: 'rows', label: 'Rows', type: 'number', default: 24 },
    { name: 'env_vars', label: 'Environment Variables', type: 'config', help: 'JSON object' },
    { name: 'working_directory', label: 'Working Directory', placeholder: '/home/user/project' }
  ],
  columns: [
    { key: 'name', label: 'Session', primary: true },
    { key: 'project_type', label: 'Project', badge: true },
    { key: 'status', label: 'Status', status: true },
    { key: 'shell', label: 'Shell', badge: true },
    { key: 'started_at', label: 'Started', date: true },
    { key: 'last_activity', label: 'Last Activity', date: true }
  ],
  defaults: { status: 'active', shell: 'bash', cols: 80, rows: 24, env_vars: '{}' }
});

/* ------------------------------------------------------- Audit Logs */
defineModule({
  table: 'audit_logs',
  module: 'audit',
  prefix: 'audit',
  perm: 'audit:view',
  title: 'Audit Logs',
  subtitle: 'Complete activity tracking across all resources',
  icon: 'activity',
  orderBy: 'created_at DESC',
  viewPrefix: 'audit',
  fields: [
    { name: 'user_id', label: 'User', type: 'select', options: [] },
    { name: 'action', label: 'Action', required: true, placeholder: 'create' },
    { name: 'resource_type', label: 'Resource Type', required: true, placeholder: 'service' },
    { name: 'resource_id', label: 'Resource ID', placeholder: '123' },
    { name: 'resource_name', label: 'Resource Name' },
    { name: 'result', label: 'Result', type: 'select', options: ['success', 'failure', 'error', 'denied'], default: 'success' },
    { name: 'severity', label: 'Severity', type: 'select', options: ['info', 'warning', 'critical'], default: 'info' },
    { name: 'ip_address', label: 'IP Address' },
    { name: 'country', label: 'Country' },
    { name: 'device_type', label: 'Device Type', type: 'select', options: ['desktop', 'mobile', 'tablet', 'bot'] },
    { name: 'browser', label: 'Browser' },
    { name: 'os', label: 'Operating System' }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'user_id', label: 'User', custom: 'user' },
    { key: 'action', label: 'Action', badge: true },
    { key: 'resource_type', label: 'Resource', badge: true },
    { key: 'resource_name', label: 'Name' },
    { key: 'result', label: 'Result', status: true },
    { key: 'severity', label: 'Severity', badge: true },
    { key: 'ip_address', label: 'IP' }
  ],
  defaults: { result: 'success', severity: 'info' }
});

/* ------------------------------------------------------- Security Alerts */
defineModule({
  table: 'security_alerts',
  module: 'security-alerts',
  prefix: 'security-alerts',
  perm: 'securityalerts:view',
  title: 'Security Alerts',
  subtitle: 'Real-time security monitoring and alerting',
  icon: 'alert-triangle',
  orderBy: 'created_at DESC',
  viewPrefix: 'security-alerts',
  fields: [
    { name: 'type', label: 'Alert Type', type: 'select', required: true, options: ['database_deletion', 'permission_change', 'admin_creation', 'dangerous_command', 'firewall_change', 'mass_delete', 'new_device_login', 'new_country_login', 'bruteforce_attempt', 'ssl_expiry', 'backup_failure', 'service_failure', 'unauthorized_access', 'suspicious_activity'] },
    { name: 'severity', label: 'Severity', type: 'select', options: ['info', 'warning', 'critical'], default: 'warning' },
    { name: 'title', label: 'Title', required: true, maxLength: 200 },
    { name: 'message', label: 'Message', type: 'textarea', required: true },
    { name: 'user_id', label: 'User', type: 'select', options: [] },
    { name: 'source_ip', label: 'Source IP' },
    { name: 'source_country', label: 'Source Country' },
    { name: 'source_device', label: 'Source Device' },
    { name: 'resource_type', label: 'Resource Type' },
    { name: 'resource_id', label: 'Resource ID' },
    { name: 'resource_name', label: 'Resource Name' },
    { name: 'is_acknowledged', label: 'Acknowledged', type: 'checkbox', default: false },
    { name: 'acknowledged_by', label: 'Acknowledged By', type: 'select', options: [] }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'severity', label: 'Severity', status: true },
    { key: 'title', label: 'Title' },
    { key: 'user_id', label: 'User', custom: 'user' },
    { key: 'source_ip', label: 'Source IP' },
    { key: 'is_acknowledged', label: 'Acknowledged', status: true }
  ],
  defaults: { severity: 'warning', is_acknowledged: 0 }
});

/* ------------------------------------------------------- Security Alert Rules */
defineModule({
  table: 'security_alert_rules',
  module: 'security-rules',
  prefix: 'security-rules',
  perm: 'securityrules:view',
  title: 'Security Alert Rules',
  subtitle: 'Configure alert triggers and notification channels',
  icon: 'shield-check',
  orderBy: 'created_at DESC',
  viewPrefix: 'security-rules',
  fields: [
    { name: 'name', label: 'Rule Name', required: true, maxLength: 120 },
    { name: 'type', label: 'Alert Type', type: 'select', required: true, options: ['database_deletion', 'permission_change', 'admin_creation', 'dangerous_command', 'firewall_change', 'mass_delete', 'new_device_login', 'new_country_login', 'bruteforce_attempt', 'ssl_expiry', 'backup_failure', 'service_failure', 'unauthorized_access', 'suspicious_activity'] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'severity', label: 'Default Severity', type: 'select', options: ['info', 'warning', 'critical'], default: 'warning' },
    { name: 'is_enabled', label: 'Enabled', type: 'checkbox', default: true },
    { name: 'conditions', label: 'Trigger Conditions', type: 'config', help: 'JSON conditions for triggering' },
    { name: 'cooldown_minutes', label: 'Cooldown (minutes)', type: 'number', default: 60 },
    { name: 'notify_channels', label: 'Notification Channels', type: 'config', help: 'JSON array: ["dashboard", "email", "discord", "telegram", "webhook"]' }
  ],
  columns: [
    { key: 'name', label: 'Rule', primary: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'severity', label: 'Severity', badge: true },
    { key: 'is_enabled', label: 'Enabled', status: true },
    { key: 'cooldown_minutes', label: 'Cooldown' }
  ],
  defaults: { severity: 'warning', is_enabled: 1, cooldown_minutes: 60, conditions: '{}', notify_channels: '["dashboard"]' }
});

/* ------------------------------------------------------- LeaxPanel Doctor */
defineModule({
  table: 'doctor_checks',
  module: 'doctor',
  prefix: 'doctor',
  perm: 'doctor:view',
  title: 'LeaxPanel Doctor',
  subtitle: 'System health scans and automated repairs',
  icon: 'stethoscope',
  orderBy: 'created_at DESC',
  viewPrefix: 'doctor',
  fields: [
    { name: 'name', label: 'Check Name', required: true, maxLength: 120 },
    { name: 'category', label: 'Category', type: 'select', required: true, options: ['routes', 'permissions', 'ssl', 'firewall', 'ports', 'storage', 'database', 'backups', 'services', 'logs'] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'check_function', label: 'Check Function', required: true, maxLength: 100, help: 'Function name in doctor service' },
    { name: 'fix_function', label: 'Fix Function', maxLength: 100, help: 'Function name for auto-fix (optional)' },
    { name: 'is_enabled', label: 'Enabled', type: 'checkbox', default: true },
    { name: 'is_critical', label: 'Critical', type: 'checkbox', default: false },
    { name: 'run_on_startup', label: 'Run on Startup', type: 'checkbox', default: false },
    { name: 'interval_minutes', label: 'Interval (minutes)', type: 'number', default: 60, help: '0 = manual only' }
  ],
  columns: [
    { key: 'name', label: 'Check', primary: true },
    { key: 'category', label: 'Category', badge: true },
    { key: 'is_enabled', label: 'Enabled', status: true },
    { key: 'is_critical', label: 'Critical', badge: true },
    { key: 'interval_minutes', label: 'Interval' }
  ],
  defaults: { is_enabled: 1, is_critical: 0, run_on_startup: 0, interval_minutes: 60 }
});

/* ------------------------------------------------------- Doctor Scans */
defineModule({
  table: 'doctor_scans',
  module: 'doctor-scans',
  prefix: 'doctor-scans',
  perm: 'doctor:view',
  title: 'Doctor Scan History',
  subtitle: 'Previous health scan results',
  icon: 'clipboard-check',
  orderBy: 'created_at DESC',
  viewPrefix: 'doctor-scans',
  fields: [
    { name: 'check_id', label: 'Check', type: 'select', required: true, options: [] },
    { name: 'status', label: 'Status', type: 'select', options: ['passed', 'warning', 'failed', 'error'], default: 'passed' },
    { name: 'details', label: 'Details', type: 'textarea' },
    { name: 'duration_ms', label: 'Duration (ms)', type: 'number' },
    { name: 'fixed', label: 'Auto-fixed', type: 'checkbox', default: false }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'check_id', label: 'Check', custom: 'check' },
    { key: 'status', label: 'Status', status: true },
    { key: 'duration_ms', label: 'Duration' },
    { key: 'fixed', label: 'Fixed', status: true }
  ],
  defaults: { status: 'passed', fixed: 0 }
});

/* ------------------------------------------------------- Login Page Settings */
defineModule({
  table: 'login_page_settings',
  module: 'login-page',
  prefix: 'login-page',
  perm: 'loginpage:view',
  title: 'Login Page',
  subtitle: 'Customize the premium login page appearance',
  icon: 'unlock',
  orderBy: 'key ASC',
  viewPrefix: 'login-page',
  fields: [
    { name: 'key', label: 'Setting Key', required: true, maxLength: 100 },
    { name: 'value', label: 'Value', type: 'textarea' },
    { name: 'type', label: 'Type', type: 'select', options: ['string', 'color', 'image', 'url', 'number', 'boolean', 'json'], default: 'string' },
    { name: 'description', label: 'Description' },
    { name: 'category', label: 'Category', type: 'select', options: ['branding', 'background', 'layout', 'colors', 'footer', 'animation'], default: 'branding' }
  ],
  columns: [
    { key: 'key', label: 'Key', primary: true },
    { key: 'category', label: 'Category', badge: true },
    { key: 'type', label: 'Type', badge: true },
    { key: 'value', label: 'Value', custom: 'preview' }
  ],
  defaults: { type: 'string', category: 'branding' }
});

/* ------------------------------------------------------- Workspace Login Overrides */
defineModule({
  table: 'workspace_login_overrides',
  module: 'login-overrides',
  prefix: 'login-overrides',
  perm: 'loginpage:view',
  title: 'Login Page Overrides',
  subtitle: 'Per-workspace login page customization',
  icon: 'layout',
  orderBy: 'workspace_id ASC',
  viewPrefix: 'login-overrides',
  fields: [
    { name: 'workspace_id', label: 'Workspace', type: 'select', required: true, options: [] },
    { name: 'settings', label: 'Overrides', type: 'config', help: 'JSON object with login_page_settings keys to override' }
  ],
  columns: [
    { key: 'workspace_id', label: 'Workspace', primary: true, custom: 'workspace' },
    { key: 'settings', label: 'Overrides', custom: 'json' }
  ],
  defaults: { settings: '{}' }
});

/* ------------------------------------------------------- API Endpoints */
defineModule({
  table: 'api_endpoints',
  module: 'api-endpoints',
  prefix: 'api-endpoints',
  perm: 'api:view',
  title: 'API Endpoints',
  subtitle: 'Custom REST API endpoints',
  icon: 'code',
  orderBy: 'created_at DESC',
  viewPrefix: 'api-endpoints',
  fields: [
    { name: 'name', label: 'Endpoint Name', required: true, maxLength: 120 },
    { name: 'path', label: 'Path', required: true, placeholder: '/api/v1/users' },
    { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    { name: 'handler_type', label: 'Handler Type', type: 'select', required: true, options: ['static', 'proxy', 'function', 'template'], default: 'static' },
    { name: 'handler_config', label: 'Handler Config', type: 'config', help: 'JSON configuration' },
    { name: 'response_schema', label: 'Response Schema', type: 'config', help: 'JSON Schema for response validation' },
    { name: 'auth_required', label: 'Auth Required', type: 'checkbox', default: true },
    { name: 'rate_limit', label: 'Rate Limit (req/hr)', type: 'number' },
    { name: 'rate_limit_window', label: 'Rate Limit Window (sec)', type: 'number', default: 3600 },
    { name: 'is_active', label: 'Active', type: 'checkbox', default: true }
  ],
  columns: [
    { key: 'name', label: 'Endpoint', primary: true },
    { key: 'path', label: 'Path' },
    { name: 'method', label: 'Method', badge: true },
    { key: 'handler_type', label: 'Handler', badge: true },
    { key: 'auth_required', label: 'Auth', status: true },
    { key: 'is_active', label: 'Active', status: true }
  ],
  defaults: { handler_type: 'static', auth_required: 1, is_active: 1, rate_limit_window: 3600, handler_config: '{}' }
});

/* ------------------------------------------------------- Webhooks */
defineModule({
  table: 'webhooks',
  module: 'webhooks',
  prefix: 'webhooks',
  perm: 'webhooks:view',
  title: 'Webhooks',
  subtitle: 'Outgoing webhook configurations',
  icon: 'send',
  orderBy: 'created_at DESC',
  viewPrefix: 'webhooks',
  fields: [
    { name: 'name', label: 'Webhook Name', required: true, maxLength: 120 },
    { name: 'url', label: 'Target URL', type: 'url', required: true },
    { name: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    { name: 'events', label: 'Events', type: 'config', help: 'JSON array of event names', default: '[]' },
    { name: 'secret', label: 'Secret', type: 'password', help: 'Used for signature verification' },
    { name: 'headers', label: 'Custom Headers', type: 'config', help: 'JSON object', default: '{}' },
    { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
    { name: 'retry_count', label: 'Retry Count', type: 'number', default: 3 },
    { name: 'timeout', label: 'Timeout (sec)', type: 'number', default: 30 }
  ],
  columns: [
    { key: 'name', label: 'Webhook', primary: true },
    { key: 'url', label: 'URL' },
    { key: 'method', label: 'Method', badge: true },
    { key: 'is_active', label: 'Active', status: true },
    { key: 'retry_count', label: 'Retries' }
  ],
  defaults: { method: 'POST', is_active: 1, retry_count: 3, timeout: 30, events: '[]', headers: '{}' }
});

/* ------------------------------------------------------- Webhook Deliveries */
defineModule({
  table: 'webhook_deliveries',
  module: 'webhook-deliveries',
  prefix: 'webhook-deliveries',
  perm: 'webhooks:view',
  title: 'Webhook Deliveries',
  subtitle: 'Webhook delivery logs and retry history',
  icon: 'activity',
  orderBy: 'created_at DESC',
  viewPrefix: 'webhook-deliveries',
  fields: [
    { name: 'webhook_id', label: 'Webhook', type: 'select', required: true, options: [] },
    { name: 'event', label: 'Event', required: true },
    { name: 'payload', label: 'Payload', type: 'config', help: 'JSON payload' },
    { name: 'response_status', label: 'Response Status', type: 'number' },
    { name: 'response_body', label: 'Response Body', type: 'textarea' },
    { name: 'attempt', label: 'Attempt', type: 'number', default: 1 },
    { name: 'success', label: 'Success', type: 'checkbox', default: false },
    { name: 'error_message', label: 'Error', type: 'textarea' }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'webhook_id', label: 'Webhook', custom: 'webhook' },
    { key: 'event', label: 'Event', badge: true },
    { key: 'attempt', label: 'Attempt' },
    { key: 'success', label: 'Success', status: true },
    { key: 'response_status', label: 'Status' }
  ],
  defaults: { attempt: 1, success: 0 }
});

/* ------------------------------------------------------- Terminal Command History */
defineModule({
  table: 'terminal_command_history',
  module: 'terminal-history',
  prefix: 'terminal-history',
  perm: 'terminal:view',
  title: 'Terminal History',
  subtitle: 'Command execution history and audit trail',
  icon: 'history',
  orderBy: 'created_at DESC',
  viewPrefix: 'terminal-history',
  fields: [
    { name: 'session_id', label: 'Session', type: 'select', required: true, options: [] },
    { name: 'user_id', label: 'User', type: 'select', required: true, options: [] },
    { name: 'command', label: 'Command', required: true, type: 'textarea' },
    { name: 'exit_code', label: 'Exit Code', type: 'number' },
    { name: 'output', label: 'Output', type: 'textarea' },
    { name: 'duration_ms', label: 'Duration (ms)', type: 'number' },
    { name: 'working_directory', label: 'Working Directory' }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'session_id', label: 'Session', custom: 'session' },
    { key: 'user_id', label: 'User', custom: 'user' },
    { key: 'command', label: 'Command', custom: 'command' },
    { key: 'exit_code', label: 'Exit Code', status: true },
    { key: 'duration_ms', label: 'Duration' }
  ],
  defaults: {}
});

/* ------------------------------------------------------- Terminal Permissions */
defineModule({
  table: 'terminal_permissions',
  module: 'terminal-permissions',
  prefix: 'terminal-permissions',
  perm: 'terminal:view',
  title: 'Terminal Permissions',
  subtitle: 'Control terminal access per user/project',
  icon: 'lock',
  orderBy: 'created_at DESC',
  viewPrefix: 'terminal-permissions',
  fields: [
    { name: 'user_id', label: 'User', type: 'select', required: true, options: [] },
    { name: 'workspace_id', label: 'Workspace', type: 'select', options: [] },
    { name: 'project_id', label: 'Project ID', type: 'number' },
    { name: 'project_type', label: 'Project Type', type: 'select', options: ['app', 'website', 'service', 'workspace'] },
    { name: 'allowed_commands', label: 'Allowed Commands', type: 'config', help: 'JSON array of allowed command patterns', default: '[]' },
    { name: 'denied_commands', label: 'Denied Commands', type: 'config', help: 'JSON array of denied command patterns', default: '[]' },
    { name: 'max_sessions', label: 'Max Sessions', type: 'number', default: 5 },
    { name: 'session_timeout', label: 'Session Timeout (sec)', type: 'number', default: 3600 },
    { name: 'require_approval', label: 'Require Approval', type: 'checkbox', default: false }
  ],
  columns: [
    { key: 'user_id', label: 'User', primary: true, custom: 'user' },
    { key: 'workspace_id', label: 'Workspace', custom: 'workspace' },
    { key: 'project_type', label: 'Project Type', badge: true },
    { key: 'max_sessions', label: 'Max Sessions' },
    { key: 'session_timeout', label: 'Timeout' },
    { key: 'require_approval', label: 'Approval Required', status: true }
  ],
  defaults: { allowed_commands: '[]', denied_commands: '[]', max_sessions: 5, session_timeout: 3600, require_approval: 0 }
});

/* ------------------------------------------------------- AI Agent Conversations */
defineModule({
  table: 'ai_agent_conversations',
  module: 'ai-conversations',
  prefix: 'ai-conversations',
  perm: 'ai:view',
  title: 'AI Conversations',
  subtitle: 'AI agent conversation history',
  icon: 'message-circle',
  orderBy: 'updated_at DESC',
  viewPrefix: 'ai-conversations',
  fields: [
    { name: 'agent_id', label: 'Agent', type: 'select', required: true, options: [] },
    { name: 'user_id', label: 'User', type: 'select', required: true, options: [] },
    { name: 'title', label: 'Title', maxLength: 200 },
    { name: 'messages', label: 'Messages', type: 'config', help: 'JSON array of messages' }
  ],
  columns: [
    { key: 'title', label: 'Conversation', primary: true },
    { key: 'agent_id', label: 'Agent', custom: 'agent' },
    { key: 'user_id', label: 'User', custom: 'user' },
    { key: 'updated_at', label: 'Last Message', date: true }
  ],
  defaults: { messages: '[]' }
});

/* ------------------------------------------------------- API Usage Logs */
defineModule({
  table: 'api_usage_logs',
  module: 'api-usage',
  prefix: 'api-usage',
  perm: 'api:view',
  title: 'API Usage',
  subtitle: 'API key and endpoint usage analytics',
  icon: 'bar-chart',
  orderBy: 'created_at DESC',
  viewPrefix: 'api-usage',
  fields: [
    { name: 'api_key_id', label: 'API Key', type: 'select', options: [] },
    { name: 'endpoint_id', label: 'Endpoint', type: 'select', options: [] },
    { name: 'user_id', label: 'User', type: 'select', options: [] },
    { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    { name: 'path', label: 'Path' },
    { name: 'status_code', label: 'Status', type: 'number' },
    { name: 'response_time_ms', label: 'Response Time (ms)', type: 'number' },
    { name: 'ip_address', label: 'IP Address' },
    { name: 'country', label: 'Country' }
  ],
  columns: [
    { key: 'created_at', label: 'Time', date: true, primary: true },
    { key: 'api_key_id', label: 'API Key', custom: 'apikey' },
    { key: 'endpoint_id', label: 'Endpoint', custom: 'endpoint' },
    { key: 'method', label: 'Method', badge: true },
    { key: 'status_code', label: 'Status', status: true },
    { key: 'response_time_ms', label: 'Response Time' },
    { key: 'ip_address', label: 'IP' }
  ],
  defaults: {}
});

function buildRouter(config) {
  return createResourceRouter(config);
}

module.exports = { modules, defineModule, buildRouter, STATUS_OPTIONS };
