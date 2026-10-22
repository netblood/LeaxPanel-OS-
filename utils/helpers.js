function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function generateToken(length = 32) {
  return require('crypto').randomBytes(length).toString('hex');
}

function sha256(value) {
  return require('crypto').createHash('sha256').update(String(value)).digest('hex');
}

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '—';
  const opts = { year: 'numeric', month: 'short', day: '2-digit' };
  if (withTime) {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  }
  return date.toLocaleString('en-GB', opts);
}

function timeAgo(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [label, size] of units) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) return `${amount} ${label}${amount > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

const STATUS_TONES = {
  active: 'success',
  running: 'success',
  online: 'success',
  completed: 'success',
  healthy: 'success',
  deployed: 'success',
  paid: 'success',
  approved: 'success',
  resolved: 'success',
  enabled: 'success',
  connected: 'success',
  pending: 'warning',
  provisioning: 'warning',
  processing: 'warning',
  queued: 'warning',
  trial: 'warning',
  inactive: 'muted',
  stopped: 'muted',
  draft: 'muted',
  archived: 'muted',
  disabled: 'muted',
  failed: 'danger',
  error: 'danger',
  suspended: 'danger',
  overdue: 'danger',
  deleted: 'danger',
  cancelled: 'muted',
  rejected: 'danger'
};

function statusTone(status) {
  return STATUS_TONES[String(status || '').toLowerCase()] || 'info';
}

function safeJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function maskSecret(value, visible = 4) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visible) return '•'.repeat(str.length);
  return str.slice(0, visible) + '•'.repeat(Math.max(6, str.length - visible));
}

function humanField(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {
  formatBytes,
  formatUptime,
  slugify,
  truncate,
  generateToken,
  sha256,
  formatDate,
  timeAgo,
  statusTone,
  safeJson,
  maskSecret,
  humanField
};
