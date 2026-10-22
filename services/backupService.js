const nodeCron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

class BackupService {
  constructor() {
    this.tasks = [];
    this.scheduleExpression = process.env.BACKUP_CRON || '0 3 * * *';
  }

  start() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (err) {
      logger.warn('Could not create backup directory:', err.message);
    }

    if (!nodeCron.validate(this.scheduleExpression)) {
      logger.warn('Invalid BACKUP_CRON expression, scheduled backups disabled');
      return;
    }

    this.schedule(this.scheduleExpression, () => {
      this.createBackup('Scheduled Backup', 'scheduled', null).catch(err => logger.error('Scheduled backup failed:', err.message));
    });

    logger.info(`Backup service initialized (schedule: ${this.scheduleExpression})`);
  }

  /**
   * Creates a backup record and a snapshot manifest on disk.
   */
  async createBackup(name, type = 'manual', userId = null) {
    const result = db.run(
      "INSERT INTO backups (name, type, status, file_path, size_bytes, user_id, created_at) VALUES (?, ?, 'completed', NULL, 0, ?, datetime('now'))",
      [name, type, userId]
    );

    const backupId = result.lastInsertRowid;
    const manifest = {
      id: backupId,
      name,
      type,
      createdAt: new Date().toISOString(),
      resources: this.collectResources()
    };

    let filePath = null;
    let size = 0;
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const fileName = `backup-${backupId}-${Date.now()}.json`;
      filePath = path.join(BACKUP_DIR, fileName);
      const payload = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(filePath, payload, 'utf8');
      size = Buffer.byteLength(payload);
      db.run('UPDATE backups SET file_path = ?, size_bytes = ? WHERE id = ?', [filePath, size, backupId]);
    } catch (err) {
      logger.error('Backup write failed:', err.message);
      db.run("UPDATE backups SET status = 'failed' WHERE id = ?", [backupId]);
    }

    db.run(
      "INSERT INTO backup_snapshots (backup_id, name, scope, status, size_bytes, manifest, restore_point, created_at) VALUES (?, ?, ?, 'available', ?, ?, NULL, datetime('now'))",
      [backupId, `${name} snapshot`, type, size, JSON.stringify(manifest)]
    );

    return { id: backupId, filePath, size };
  }

  collectResources() {
    const resources = [];
    const tables = ['websites', 'databases', 'apps', 'bots', 'n8n_workflows', 'domains', 'services'];
    for (const table of tables) {
      try {
        const row = db.get(`SELECT COUNT(*) AS count FROM ${table}`);
        resources.push({ type: table, count: row ? row.count : 0 });
      } catch (err) {
        resources.push({ type: table, count: 0 });
      }
    }
    return resources;
  }

  listBackups(limit = 50) {
    try {
      return db.all('SELECT * FROM backups ORDER BY created_at DESC LIMIT ?', [limit]);
    } catch (err) {
      return [];
    }
  }

  schedule(cronExpression, callback) {
    const task = nodeCron.schedule(cronExpression, callback);
    this.tasks.push(task);
    return task;
  }

  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    logger.info('Backup service stopped');
  }
}

module.exports = new BackupService();
module.exports.BACKUP_DIR = BACKUP_DIR;
