// System introspection helpers used by the Dashboard and LeaxPanel Doctor.
const os = require('os');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { execFile } = require('child_process');
const { formatBytes, formatUptime } = require('../utils/helpers');

const ROOT = path.join(__dirname, '..');

function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const [type, value] of Object.entries(cpu.times)) {
      total += value;
      if (type === 'idle') idle += value;
    }
  }
  const usage = total > 0 ? Math.min(100, Math.max(0, ((total - idle) / total) * 100)) : 0;
  return { cores: cpus.length, load: os.loadavg()[0], usage: Math.round(usage) };
}

function memorySnapshot() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    total,
    free,
    used,
    usage: Math.round((used / total) * 100),
    totalLabel: formatBytes(total),
    usedLabel: formatBytes(used),
    freeLabel: formatBytes(free)
  };
}

function diskSnapshot(target = ROOT) {
  try {
    if (process.platform === 'win32') {
      return { total: 0, free: 0, used: 0, usage: 0, totalLabel: '—', usedLabel: '—', freeLabel: '—' };
    }
    const stats = fs.statfsSync(target);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    const used = total - free;
    return {
      total,
      free,
      used,
      usage: Math.round((used / total) * 100),
      totalLabel: formatBytes(total),
      usedLabel: formatBytes(used),
      freeLabel: formatBytes(free)
    };
  } catch (err) {
    return { total: 0, free: 0, used: 0, usage: 0, totalLabel: '—', usedLabel: '—', freeLabel: '—' };
  }
}

function networkSnapshot() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const [name, list] of Object.entries(interfaces)) {
    for (const entry of list || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push({ interface: name, address: entry.address, mac: entry.mac });
      }
    }
  }
  return addresses;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    try {
      server.listen(port, '0.0.0.0');
    } catch (err) {
      resolve(false);
    }
  });
}

function commandExists(command) {
  return new Promise((resolve) => {
    const probe = process.platform === 'win32' ? 'where' : 'which';
    execFile(probe, [command], (error) => resolve(!error));
  });
}

async function detectEnvironment() {
  const [pm2, nginx, docker, certbot, ufw] = await Promise.all([
    commandExists('pm2'),
    commandExists('nginx'),
    commandExists('docker'),
    commandExists('certbot'),
    commandExists('ufw')
  ]);

  let osName = 'Unknown';
  if (process.platform === 'win32') osName = 'Windows';
  else if (process.platform === 'darwin') osName = 'macOS';
  else {
    try {
      const release = fs.readFileSync('/etc/os-release', 'utf8');
      const match = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (match) osName = match[1];
    } catch (err) {
      osName = 'Linux';
    }
  }

  return {
    os: osName,
    platform: process.platform,
    arch: os.arch(),
    nodeVersion: process.version,
    npmVersion: process.env.npm_config_user_agent || null,
    pm2,
    nginx,
    docker,
    certbot,
    firewall: ufw ? 'ufw' : (process.platform === 'win32' ? 'Windows Defender Firewall' : 'none'),
    hostname: os.hostname(),
    uptime: formatUptime(os.uptime())
  };
}

function processSnapshot(limit = 12) {
  const snapshot = [];
  const entries = fs.readdirSync(path.join(ROOT, 'data'), { withFileTypes: true });
  for (const entry of entries.slice(0, limit)) {
    const full = path.join(ROOT, 'data', entry.name);
    let size = 0;
    try { size = fs.statSync(full).size; } catch (err) { size = 0; }
    snapshot.push({ name: entry.name, type: entry.isDirectory() ? 'dir' : 'file', size });
  }
  return snapshot;
}

module.exports = {
  ROOT,
  cpuSnapshot,
  memorySnapshot,
  diskSnapshot,
  networkSnapshot,
  isPortFree,
  commandExists,
  detectEnvironment,
  processSnapshot
};
