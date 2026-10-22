// Smart Reverse Proxy Engine - generates proxy configs per service.
// Supports both built-in (Node.js http-proxy) and nginx config generation.
const db = require('../config/db');
const logger = require('../utils/logger');

class ReverseProxy {
  /**
   * Generate proxy configuration for a service.
   */
  async createConfig(serviceType, serviceId, sourceDomain, targetPort, options = {}) {
    const config = {
      service_type: serviceType,
      service_id: serviceId,
      source_domain: sourceDomain,
      target_port: targetPort,
      config_type: options.configType || 'built-in',
      ssl_enabled: options.sslEnabled !== false ? 1 : 0,
      headers: JSON.stringify(options.headers || {
        'X-Forwarded-For': '$proxy_add_x_forwarded_for',
        'X-Forwarded-Proto': '$scheme',
        'X-Real-IP': '$remote_addr',
        'Host': '$host',
        'X-LeaxPanel-Service': `${serviceType}:${serviceId}`
      }),
      caching: options.caching !== false ? 1 : 0,
      compression: options.compression !== false ? 1 : 0,
      health_check_path: options.healthCheckPath || '/health',
      health_check_interval: options.healthCheckInterval || 30,
      status: 'active'
    };

    const result = db.run(
      `INSERT INTO proxy_configs (service_type, service_id, source_domain, target_port, config_type, ssl_enabled, headers, caching, compression, health_check_path, health_check_interval, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.service_type, config.service_id, config.source_domain, config.target_port,
       config.config_type, config.ssl_enabled, config.headers, config.caching,
       config.compression, config.health_check_path, config.health_check_interval, config.status]
    );

    logger.info(`[ReverseProxy] Created config for ${sourceDomain} -> localhost:${targetPort}`);
    return { id: result.lastInsertRowid, ...config };
  }

  /**
   * Get proxy configuration for a service.
   */
  getConfig(serviceType, serviceId) {
    return db.get(
      'SELECT * FROM proxy_configs WHERE service_type = ? AND service_id = ?',
      [serviceType, serviceId]
    );
  }

  /**
   * Get all proxy configurations.
   */
  getAll() {
    return db.all(`
      SELECT pc.*, u.email as user_email
      FROM proxy_configs pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.status = 'active'
      ORDER BY pc.created_at DESC
    `);
  }

  /**
   * Generate nginx configuration for a service (for external nginx).
   */
  generateNginxConfig(config) {
    const headers = JSON.parse(config.headers || '{}');
    let headerLines = '';
    for (const [key, value] of Object.entries(headers)) {
      headerLines += `    proxy_set_header ${key} ${value};\n`;
    }

    const sslBlock = config.ssl_enabled ? `
    # SSL configuration handled by Cloudflare or certbot
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/${config.source_domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${config.source_domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
` : '';

    return `
server {
    listen 80;
    server_name ${config.source_domain};

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
${sslBlock}
    server_name ${config.source_domain};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Proxy to backend
    location / {
        proxy_pass http://127.0.0.1:${config.target_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
${headerLines}        proxy_read_timeout 90s;
        proxy_send_timeout 90s;

        # Compression
${config.compression ? `
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml application/json;
` : ''}

        # Caching
${config.caching ? `
        proxy_cache leaxpanel;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header X-Cache-Status $upstream_cache_status;
` : ''}
    }

    # Health check endpoint
    location ${config.health_check_path} {
        proxy_pass http://127.0.0.1:${config.target_port}${config.health_check_path};
        access_log off;
    }
}
`;
  }

  /**
   * Generate all nginx configs for active services (for bulk deployment).
   */
  generateAllNginxConfigs() {
    const configs = this.getAll();
    let allConfigs = '# LeaxPanel Auto-Generated Nginx Configs\n';
    for (const config of configs) {
      allConfigs += this.generateNginxConfig(config) + '\n';
    }
    return allConfigs;
  }

  /**
   * Update proxy configuration.
   */
  updateConfig(serviceType, serviceId, updates) {
    const allowed = ['target_port', 'config_type', 'ssl_enabled', 'headers', 'caching', 'compression', 'health_check_path', 'health_check_interval', 'status'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'headers' ? JSON.stringify(updates[key]) : updates[key]);
      }
    }

    if (fields.length === 0) return { success: false, reason: 'No valid updates' };

    fields.push('updated_at = datetime(\'now\')');
    values.push(serviceType, serviceId);

    const result = db.run(
      `UPDATE proxy_configs SET ${fields.join(', ')} WHERE service_type = ? AND service_id = ?`,
      values
    );

    return { success: result.changes > 0 };
  }

  /**
   * Delete proxy configuration.
   */
  deleteConfig(serviceType, serviceId) {
    const result = db.run(
      `DELETE FROM proxy_configs WHERE service_type = ? AND service_id = ?`,
      [serviceType, serviceId]
    );
    return { success: result.changes > 0 };
  }
}

module.exports = new ReverseProxy();