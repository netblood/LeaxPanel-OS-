// Security Alerts Service - Real-time notifications for dangerous actions
const db = require('../config/db');
const logger = require('../utils/logger');
const socketService = require('./socketService');

const ALERT_TYPES = {
  // Critical alerts
  DATABASE_DELETION: { type: 'database_deletion', severity: 'critical', title: 'Database Deleted' },
  PERMISSION_CHANGES: { type: 'permission_changes', severity: 'critical', title: 'Permission Escalation Detected' },
  ADMIN_CREATION: { type: 'admin_creation', severity: 'critical', title: 'New Admin Account Created' },
  DANGEROUS_COMMANDS: { type: 'dangerous_commands', severity: 'critical', title: 'Dangerous Command Executed' },
  FIREWALL_CHANGES: { type: 'firewall_changes', severity: 'critical', title: 'Firewall Configuration Changed' },
  MASS_DELETES: { type: 'mass_deletes', severity: 'critical', title: 'Mass Deletion Detected' },
  
  // Warning alerts
  NEW_DEVICE_LOGIN: { type: 'new_device_login', severity: 'warning', title: 'New Device Login' },
  NEW_COUNTRY_LOGIN: { type: 'new_country_login', severity: 'warning', title: 'New Country Login' },
  BRUTEFORCE_ATTEMPTS: { type: 'bruteforce_attempts', severity: 'warning', title: 'Brute Force Attempt Detected' },
  
  // Info alerts
  SERVICE_STARTED: { type: 'service_started', severity: 'info', title: 'Service Started' },
  SERVICE_STOPPED: { type: 'service_stopped', severity: 'info', title: 'Service Stopped' },
  SSL_EXPIRY: { type: 'ssl_expiry', severity: 'warning', title: 'SSL Certificate Expiring' },
  BACKUP_FAILED: { type: 'backup_failed', severity: 'warning', title: 'Backup Failed' },
  DISK_SPACE_LOW: { type: 'disk_space_low', severity: 'warning', title: 'Low Disk Space' },
  HIGH_CPU_USAGE: { type: 'high_cpu_usage', severity: 'warning', title: 'High CPU Usage' },
  HIGH_MEMORY_USAGE: { type: 'high_memory_usage', severity: 'warning', title: 'High Memory Usage' }
};

let alertCache = new Map();

function generateAlertId() {
  return require('crypto').randomBytes(12).toString('hex');
}

async function createAlert(alertType, userId, details = {}, options = {}) {
  const config = ALERT_TYPES[alertType];
  if (!config) {
    throw new Error(`Unknown alert type: ${alertType}`);
  }

  const alertId = generateAlertId();
  const alert = {
    id: alertId,
    type: config.type,
    severity: config.severity,
    title: config.title,
    user_id: userId,
    details: JSON.stringify(details),
    source: options.source || 'system',
    metadata: JSON.stringify(options.metadata || {}),
    acknowledged: 0,
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: new Date().toISOString()
  };

  try {
    // Save to database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO security_alerts (id, type, severity, title, user_id, details, source, metadata, acknowledged, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [alert.id, alert.type, alert.severity, alert.title, alert.user_id, alert.details, alert.source, alert.metadata, alert.acknowledged, alert.created_at],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Cache recent alerts
    if (!alertCache.has(userId)) {
      alertCache.set(userId, []);
    }
    const userAlerts = alertCache.get(userId);
    userAlerts.unshift(alert);
    if (userAlerts.length > 100) userAlerts.pop();

    // Real-time notification via Socket.IO
    if (socketService.io) {
      socketService.io.to(`user:${userId}`).emit('security:alert', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        details,
        created_at: alert.created_at
      });
    }

    logger.warn(`Security alert: ${config.title} for user ${userId}`, details);

    return alert;
  } catch (err) {
    logger.error('Failed to create security alert:', err);
    throw err;
  }
}

async function getAlerts(userId, options = {}) {
  const { severity, limit = 50, offset = 0, unacknowledgedOnly = false } = options;
  
  let query = 'SELECT * FROM security_alerts WHERE user_id = ?';
  const params = [userId];
  
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  
  if (unacknowledgedOnly) {
    query += ' AND acknowledged = 0';
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    return await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({
          ...r,
          details: r.details ? JSON.parse(r.details) : {},
          metadata: r.metadata ? JSON.parse(r.metadata) : {}
        })));
      });
    });
  } catch (err) {
    logger.error('Failed to get alerts:', err);
    return [];
  }
}

async function acknowledgeAlert(alertId, userId) {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE security_alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now') WHERE id = ? AND user_id = ?`,
        [userId, alertId, userId],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    // Update cache
    const userAlerts = alertCache.get(userId);
    if (userAlerts) {
      const alert = userAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = 1;
        alert.acknowledged_by = userId;
        alert.acknowledged_at = new Date().toISOString();
      }
    }
    
    return true;
  } catch (err) {
    logger.error('Failed to acknowledge alert:', err);
    return false;
  }
}

async function getUnacknowledgedCount(userId) {
  try {
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM security_alerts WHERE user_id = ? AND acknowledged = 0', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    return row ? row.count : 0;
  } catch (err) {
    return 0;
  }
}

// Specific alert check functions
async function checkNewDeviceLogin(userId, deviceInfo, ipAddress) {
  const knownDevices = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT user_agent FROM audit_logs WHERE user_id = ? AND created_at > datetime("now", "-30 days")', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.user_agent));
    });
  });
  
  const isNewDevice = !knownDevices.some(ua => ua && ua.includes(deviceInfo.browser) && ua.includes(deviceInfo.os));
  
  if (isNewDevice) {
    await createAlert('NEW_DEVICE_LOGIN', userId, {
      ip: ipAddress,
      device: deviceInfo,
      userAgent: deviceInfo.userAgent
    }, { source: 'auth' });
  }
  
  return isNewDevice;
}

async function checkNewCountryLogin(userId, country, ipAddress) {
  const knownCountries = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT country FROM audit_logs WHERE user_id = ? AND created_at > datetime("now", "-90 days")', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.country).filter(Boolean));
    });
  });
  
  const isNewCountry = !knownCountries.includes(country);
  
  if (isNewCountry) {
    await createAlert('NEW_COUNTRY_LOGIN', userId, {
      ip: ipAddress,
      country: country
    }, { source: 'auth' });
  }
  
  return isNewCountry;
}

async function checkBruteforceAttempts(ipAddress, threshold = 5, windowMinutes = 15) {
  const attempts = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM audit_logs 
       WHERE ip_address = ? AND action LIKE '%login%' AND status_code IN (401, 403)
       AND created_at > datetime('now', '-${windowMinutes} minutes')`,
      [ipAddress],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
  
  if (attempts >= threshold) {
    // Get a user associated with this IP
    const userRow = await new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM audit_logs WHERE ip_address = ? AND user_id IS NOT NULL ORDER BY created_at DESC LIMIT 1', [ipAddress], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (userRow) {
      await createAlert('BRUTEFORCE_ATTEMPTS', userRow.user_id, {
        ip: ipAddress,
        attempts,
        window: `${windowMinutes} minutes`
      }, { source: 'security' });
    }
    return true;
  }
  
  return false;
}

async function checkMassDeletes(userId, resourceType, count, threshold = 10, windowMinutes = 5) {
  if (count >= threshold) {
    await createAlert('MASS_DELETES', userId, {
      resourceType,
      count,
      window: `${windowMinutes} minutes`
    }, { source: 'audit' });
    return true;
  }
  return false;
}

async function checkDangerousCommand(userId, command, sessionId) {
  const dangerousPatterns = [
    'rm -rf /',
    'rm -rf ~',
    'dd if=',
    'mkfs.',
    'fdisk',
    'wipefs',
    'shred',
    'chmod 777',
    'chown -R',
    ':(){ :|:& };:', // fork bomb
    '> /dev/sda',
    'mv / /dev/null'
  ];
  
  const isDangerous = dangerousPatterns.some(pattern => 
    command.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isDangerous) {
    await createAlert('DANGEROUS_COMMANDS', userId, {
      command,
      sessionId,
      pattern: dangerousPatterns.find(p => command.toLowerCase().includes(p.toLowerCase()))
    }, { source: 'terminal' });
  }
  
  return isDangerous;
}

async function checkDatabaseDeletion(userId, databaseName, databaseType) {
  await createAlert('DATABASE_DELETION', userId, {
    databaseName,
    databaseType
  }, { source: 'database' });
}

async function checkPermissionChanges(userId, targetUserId, oldRole, newRole, changedBy) {
  const isEscalation = ROLE_LEVELS[newRole] > ROLE_LEVELS[oldRole];
  
  if (isEscalation && (newRole === 'admin' || newRole === 'owner')) {
    await createAlert('PERMISSION_CHANGES', userId, {
      targetUserId,
      oldRole,
      newRole,
      changedBy
    }, { source: 'rbac' });
  }
}

async function checkAdminCreation(userId, newAdminId) {
  await createAlert('ADMIN_CREATION', userId, {
    newAdminId
  }, { source: 'rbac' });
}

async function checkFirewallChanges(userId, changes) {
  await createAlert('FIREWALL_CHANGES', userId, {
    changes
  }, { source: 'firewall' });
}

async function checkSSLEpiry(daysUntilExpiry = 30) {
  // This would be run periodically by a cron job
  const expiringCerts = await new Promise((resolve, reject) => {
    db.all(
      `SELECT d.name, d.user_id, ssl_expires 
       FROM domains d 
       WHERE ssl_expires IS NOT NULL 
       AND date(ssl_expires) <= date('now', '+${daysUntilExpiry} days')
       AND date(ssl_expires) >= date('now')`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  for (const cert of expiringCerts) {
    await createAlert('SSL_EXPIRY', cert.user_id, {
      domain: cert.name,
      expires: cert.ssl_expires,
      daysRemaining: Math.ceil((new Date(cert.ssl_expires) - new Date()) / (1000 * 60 * 60 * 24))
    }, { source: 'ssl' });
  }
}

const ROLE_LEVELS = {
  'owner': 100,
  'admin': 90,
  'reseller': 80,
  'manager': 70,
  'developer': 60,
  'support': 50,
  'billing': 40,
  'user': 30,
  'viewer': 10
};

module.exports = {
  ALERT_TYPES,
  createAlert,
  getAlerts,
  acknowledgeAlert,
  getUnacknowledgedCount,
  checkNewDeviceLogin,
  checkNewCountryLogin,
  checkBruteforceAttempts,
  checkMassDeletes,
  checkDangerousCommand,
  checkDatabaseDeletion,
  checkPermissionChanges,
  checkAdminCreation,
  checkFirewallChanges,
  checkSSLEpiry
};