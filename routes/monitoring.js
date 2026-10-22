const express = require('express');
const router = express.Router();
const db = require('../config/db');
const systemService = require('../services/systemService');
const { formatUptime } = require('../utils/helpers');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const cpu = systemService.cpuSnapshot();
    const memory = systemService.memorySnapshot();
    const disk = systemService.diskSnapshot();
    const network = systemService.networkSnapshot();

    let metrics = [];
    try {
      metrics = db.all('SELECT * FROM monitoring_metrics ORDER BY recorded_at DESC LIMIT 60');
    } catch (err) { /* optional table */ }

    const uptime = process.uptime();
    const resources = [
      { label: 'CPU', usage: cpu.usage, detail: `${cpu.cores} cores · load ${cpu.load.toFixed(2)}` },
      { label: 'Memory', usage: memory.usage, detail: `${memory.usedLabel} of ${memory.totalLabel}` },
      { label: 'Disk', usage: disk.usage, detail: `${disk.usedLabel} of ${disk.totalLabel}` }
    ];

    res.render('monitoring/index', {
      title: 'Monitoring',
      pageTitle: 'Monitoring',
      pageSubtitle: 'Realtime CPU, memory, disk, network and process telemetry',
      cpu,
      memory,
      disk,
      network,
      metrics,
      rows: metrics,
      uptime,
      uptimeLabel: formatUptime(uptime),
      resources,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      hostname: require('os').hostname()
    });
  } catch (err) {
    logger.error('Monitoring error:', err);
    res.status(500).render('errors/500', { title: 'Server Error', pageTitle: '500', errorMessage: err.message, user: req.session.user });
  }
});

router.get('/metrics.json', (req, res) => {
  const cpu = systemService.cpuSnapshot();
  const memory = systemService.memorySnapshot();
  const disk = systemService.diskSnapshot();
  res.json({
    timestamp: new Date().toISOString(),
    cpu,
    memory: { usage: memory.usage, used: memory.used, total: memory.total },
    disk: { usage: disk.usage, used: disk.used, total: disk.total },
    uptime: process.uptime()
  });
});

module.exports = router;
