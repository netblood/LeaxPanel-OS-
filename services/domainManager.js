// Smart Domain Manager - auto subdomain generation, DNS provisioning, SSL management.
const db = require('../config/db');
const logger = require('../utils/logger');
const cloudflareService = require('./cloudflareService');

class DomainManager {
  /**
   * Generate a subdomain for a service based on its type and name.
   * Format: {service-name}.{platform-domain}
   */
  generateSubdomain(serviceType, serviceName, platformDomain) {
    const sanitized = String(serviceName)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);

    const prefixMap = {
      'website': 'site',
      'apps': 'app',
      'n8n': 'n8n',
      'telegram': 'tg',
      'discord': 'dc',
      'whatsapp': 'wa',
      'bots': 'bot',
      'ai': 'ai',
      'ai-hosting': 'ai',
      'databases': 'db',
      'email': 'mail',
      'storage': 'files',
      'communication': 'chat',
      'cloudflare': 'cf',
      'services': 'svc',
      'marketplace': 'market',
      'platform': 'platform',
      'white-label': 'brand',
      'requests': 'requests',
      'monitoring': 'monitor',
      'backups': 'backup',
      'security': 'sec',
      'settings': 'settings',
      'profile': 'profile',
      'notifications': 'notify',
      'apikeys': 'api',
      'ai-settings': 'ai',
      'file-manager': 'files',
    };

    const prefix = prefixMap[serviceType] || 'svc';
    const subdomain = `${prefix}-${sanitized}`;
    const fullDomain = `${subdomain}.${platformDomain}`;

    return { subdomain, fullDomain };
  }

  /**
   * Reserve a subdomain for a service.
   */
  async reserveSubdomain(serviceType, serviceId, serviceName, platformDomain, userId) {
    const { subdomain, fullDomain } = this.generateSubdomain(serviceType, serviceName, platformDomain);

    // Check if already exists
    const existing = db.get(
      'SELECT id FROM service_domains WHERE full_domain = ?',
      [fullDomain]
    );

    if (existing) {
      throw new Error(`Subdomain ${fullDomain} already exists`);
    }

    const result = db.run(
      `INSERT INTO service_domains (service_type, service_id, subdomain, full_domain, platform_domain, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [serviceType, serviceId, subdomain, fullDomain, platformDomain, userId]
    );

    logger.info(`[DomainManager] Reserved ${fullDomain} for ${serviceType}:${serviceId}`);
    return { id: result.lastInsertRowid, subdomain, fullDomain, platformDomain };
  }

  /**
   * Provision DNS and SSL for a service domain (calls Cloudflare).
   */
  async provision(serviceType, serviceId) {
    const domain = db.get(
      'SELECT * FROM service_domains WHERE service_type = ? AND service_id = ?',
      [serviceType, serviceId]
    );

    if (!domain) {
      throw new Error(`No domain reserved for ${serviceType}:${serviceId}`);
    }

    // Get Cloudflare zone
    const panelSettings = require('./panelSettingsService');
    const cfToken = panelSettings.get('cloudflare_api_token');
    const cfZoneId = panelSettings.get('cloudflare_zone_id');
    const platformDomain = panelSettings.get('platform_domain');

    if (!cfToken || !cfZoneId || !platformDomain) {
      logger.warn('[DomainManager] Cloudflare not configured, skipping DNS provision');
      return { success: false, reason: 'Cloudflare not configured' };
    }

    try {
      // Create DNS record via Cloudflare
      const dnsResult = await cloudflareService.createRecord(cfToken, cfZoneId, {
        type: 'CNAME',
        name: domain.subdomain,
        content: platformDomain,
        proxied: true,
        ttl: 1,
        comment: `LeaxPanel auto: ${serviceType}:${serviceId}`
      });

      if (dnsResult.success) {
        db.run(
          `UPDATE service_domains SET dns_status = 'active' WHERE id = ?`,
          [domain.id]
        );

        // Also record in cloudflare_auto_dns table
        db.run(
          `INSERT INTO cloudflare_auto_dns (zone_id, record_name, record_type, record_value, proxied, ttl, service_type, service_id)
           VALUES (?, ?, 'CNAME', ?, 1, 1, ?, ?)`,
          [cfZoneId, domain.subdomain, platformDomain, serviceType, serviceId]
        );

        // SSL is handled automatically by Cloudflare when proxied=true
        db.run(
          `UPDATE service_domains SET ssl_status = 'active' WHERE id = ?`,
          [domain.id]
        );

        logger.info(`[DomainManager] DNS + SSL provisioned for ${domain.fullDomain}`);
        return { success: true, domain: domain.fullDomain, record: dnsResult.result };
      } else {
        throw new Error(dnsResult.error);
      }
    } catch (err) {
      logger.error(`[DomainManager] Provision failed for ${domain.fullDomain}:`, err);
      db.run(
        `UPDATE service_domains SET dns_status = 'error', ssl_status = 'error' WHERE id = ?`,
        [domain.id]
      );
      return { success: false, error: err.message };
    }
  }

  /**
   * Get domain info for a service.
   */
  getDomain(serviceType, serviceId) {
    return db.get(
      'SELECT * FROM service_domains WHERE service_type = ? AND service_id = ?',
      [serviceType, serviceId]
    );
  }

  /**
   * Get all service domains.
   */
  getAll() {
    return db.all(`
      SELECT sd.*, u.email as user_email
      FROM service_domains sd
      LEFT JOIN users u ON sd.user_id = u.id
      ORDER BY sd.created_at DESC
    `);
  }

  /**
   * Delete a service domain (also removes DNS record).
   */
  async deleteDomain(serviceType, serviceId) {
    const domain = db.get(
      'SELECT * FROM service_domains WHERE service_type = ? AND service_id = ?',
      [serviceType, serviceId]
    );

    if (!domain) return { success: false, reason: 'Not found' };

    const panelSettings = require('./panelSettingsService');
    const cfToken = panelSettings.get('cloudflare_api_token');
    const cfZoneId = panelSettings.get('cloudflare_zone_id');

    if (cfToken && cfZoneId) {
      try {
        await cloudflareService.deleteRecord(cfToken, cfZoneId, domain.subdomain);
      } catch (err) {
        logger.warn(`[DomainManager] Failed to delete DNS record for ${domain.subdomain}:`, err.message);
      }
    }

    // Clean up proxy config
    db.run(
      `DELETE FROM proxy_configs WHERE service_type = ? AND service_id = ?`,
      [serviceType, serviceId]
    );

    // Clean up provision record
    db.run(
      `DELETE FROM service_provisions WHERE service_type = ? AND service_id = ?`,
      [serviceType, serviceId]
    );

    // Clean up cloudflare_auto_dns
    db.run(
      `DELETE FROM cloudflare_auto_dns WHERE service_type = ? AND service_id = ?`,
      [serviceType, serviceId]
    );

    // Finally delete the domain record
    db.run(
      `DELETE FROM service_domains WHERE service_type = ? AND service_id = ?`,
      [serviceType, serviceId]
    );

    logger.info(`[DomainManager] Deleted domain ${domain.fullDomain} for ${serviceType}:${serviceId}`);
    return { success: true };
  }

  /**
   * Verify DNS resolution for a domain.
   */
  async verifyDNS(fullDomain) {
    const dns = require('dns').promises;
    try {
      const addresses = await dns.resolve4(fullDomain);
      return { success: true, addresses };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new DomainManager();