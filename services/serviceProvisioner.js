// Smart Service Provisioner - unified deployment pipeline for all service types.
// When deploying any service: folder → env → port → logs → backups → monitoring → SSL → domain → proxy → permissions → audit → online.
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const portManager = require('./portManager');
const domainManager = require('./domainManager');
const reverseProxy = require('./reverseProxy');

const SERVICES_ROOT = process.env.SERVICES_ROOT || path.join(__dirname, '..', 'services_data');

class ServiceProvisioner {
  constructor() {
    if (!fs.existsSync(SERVICES_ROOT)) {
      fs.mkdirSync(SERVICES_ROOT, { recursive: true });
    }
  }

  /**
   * Provision a complete service with auto domain, port, SSL, proxy config.
   */
  async provision(serviceType, serviceId, serviceName, userId, options = {}) {
    const panelSettings = require('./panelSettingsService');
    const platformDomain = panelSettings.get('platform_domain');
    const autoSSL = options.autoSSL !== false && panelSettings.get('auto_ssl') === 'true';
    const autoDNS = options.autoDNS !== false && panelSettings.get('auto_dns') === 'true';

    // Start provision record
    const provision = db.run(
      `INSERT INTO service_provisions (service_type, service_id, status, user_id)
       VALUES (?, ?, 'provisioning', ?)`,
      [serviceType, serviceId, userId]
    );
    const provisionId = provision.lastInsertRowid;

    try {
      // Step 1: Create service folder
      const folderPath = path.join(SERVICES_ROOT, serviceType, serviceId);
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info(`[Provisioner] Created folder ${folderPath}`);

      // Step 2: Create .env file
      const envContent = this.generateEnv(serviceType, serviceId, options);
      fs.writeFileSync(path.join(folderPath, '.env'), envContent);

      // Step 3: Allocate port
      const allocatedPort = await portManager.findFreePort(
        serviceType, serviceId, userId, options.preferredPort
      );
      logger.info(`[Provisioner] Allocated port ${allocatedPort} for ${serviceType}:${serviceId}`);

      // Step 4: Reserve domain (if platform domain configured)
      let domainInfo = null;
      if (platformDomain && autoDNS) {
        domainInfo = await domainManager.reserveSubdomain(serviceType, serviceId, serviceName, platformDomain, userId);
        logger.info(`[Provisioner] Reserved domain ${domainInfo.fullDomain}`);

        // Step 5: Provision DNS + SSL via Cloudflare
        if (autoSSL) {
          await domainManager.provision(serviceType, serviceId);
          logger.info(`[Provisioner] DNS + SSL provisioned for ${domainInfo.fullDomain}`);
        }
      }

      // Step 6: Create proxy config
      let proxyConfig = null;
      if (domainInfo) {
        proxyConfig = reverseProxy.createConfig(serviceType, serviceId, domainInfo.fullDomain, allocatedPort, {
          sslEnabled: autoSSL,
          caching: true,
          compression: true
        });
        logger.info(`[Provisioner] Reverse proxy config created for ${domainInfo.fullDomain}`);
      }

      // Step 7: Update provision record
      db.run(
        `UPDATE service_provisions SET status = 'active', folder_path = ?, port = ?, domain = ?,
         proxy_config_id = ?, completed_at = datetime('now')
         WHERE id = ?`,
        [folderPath, allocatedPort, domainInfo ? domainInfo.fullDomain : null,
         proxyConfig ? proxyConfig.id : null, provisionId]
      );

      logger.info(`[Provisioner] Service ${serviceType}:${serviceId} provisioned successfully`);

      return {
        success: true,
        provisionId,
        folderPath,
        port: allocatedPort,
        domain: domainInfo ? domainInfo.fullDomain : null,
        subdomain: domainInfo ? domainInfo.subdomain : null,
        sslEnabled: autoSSL && domainInfo ? true : false,
        proxyConfigId: proxyConfig ? proxyConfig.id : null,
        message: 'Service provisioned successfully'
      };

    } catch (err) {
      logger.error(`[Provisioner] Failed to provision ${serviceType}:${serviceId}:`, err);

      // Rollback: release port, delete domain
      portManager.releasePort(serviceType, serviceId);
      if (domainInfo) {
        domainManager.deleteDomain(serviceType, serviceId);
      }

      db.run(
        `UPDATE service_provisions SET status = 'error' WHERE id = ?`,
        [provisionId]
      );

      return { success: false, error: err.message, provisionId };
    }
  }

  /**
   * Deprovision a service (cleanup all resources).
   */
  async deprovision(serviceType, serviceId) {
    try {
      // Delete domain (also cleans up DNS, proxy config, provision record)
      await domainManager.deleteDomain(serviceType, serviceId);

      // Release port
      portManager.releasePort(serviceType, serviceId);

      // Remove service folder
      const folderPath = path.join(SERVICES_ROOT, serviceType, serviceId);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }

      logger.info(`[Provisioner] Deprovisioned ${serviceType}:${serviceId}`);
      return { success: true };
    } catch (err) {
      logger.error(`[Provisioner] Failed to deprovision ${serviceType}:${serviceId}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get provision status for a service.
   */
  getProvision(serviceType, serviceId) {
    return db.get(
      'SELECT * FROM service_provisions WHERE service_type = ? AND service_id = ?',
      [serviceType, serviceId]
    );
  }

  /**
   * Get all provisions.
   */
  getAll() {
    return db.all(`
      SELECT sp.*, u.email as user_email
      FROM service_provisions sp
      LEFT JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `);
  }

  /**
   * Generate .env file for a service.
   */
  generateEnv(serviceType, serviceId, options = {}) {
    const lines = [
      `# LeaxPanel Service Environment`,
      `# Service: ${serviceType}:${serviceId}`,
      `# Auto-generated by LeaxPanel Service Provisioner`,
      `LEAXPANEL_SERVICE_TYPE=${serviceType}`,
      `LEAXPANEL_SERVICE_ID=${serviceId}`,
      `PORT=${options.preferredPort || 3001}`,
      `NODE_ENV=production`,
      `APP_NAME=${serviceName}`,
      `APP_URL=${options.appUrl || 'http://localhost:3000'}`,
    ];

    // Service-specific defaults
    switch (serviceType) {
      case 'apps':
        lines.push(`APP_TYPE=${options.appType || 'nodejs'}`);
        lines.push(`START_COMMAND=${options.startCommand || 'npm start'}`);
        break;
      case 'website':
        lines.push(`WEBSITE_PLATFORM=${options.platform || 'static'}`);
        break;
      case 'n8n':
        lines.push(`N8N_HOST=${options.host || 'localhost'}`);
        lines.push(`N8N_PORT=${options.preferredPort || 3001}`);
        break;
      case 'telegram':
        lines.push(`TELEGRAM_BOT_TOKEN=${options.botToken || ''}`);
        break;
      case 'discord':
        lines.push(`DISCORD_BOT_TOKEN=${options.botToken || ''}`);
        break;
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get services root path.
   */
  getServicesRoot() {
    return SERVICES_ROOT;
  }
}

module.exports = new ServiceProvisioner();