const express = require('express');
const router = express.Router();
const os = require('os');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  const stats = {
    cpu: os.cpus().length,
    freemem: require('utils/helpers').formatBytes(os.freemem()),
    totalmem: require('utils/helpers').formatBytes(os.totalmem()),
    uptime: require('utils/helpers').formatUptime(process.uptime()),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version
  };
  res.render('monitoring/index', { title: 'Monitoring - LEAXOS', stats });
});

module.exports = router;
