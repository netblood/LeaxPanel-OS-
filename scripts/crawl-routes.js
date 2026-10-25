// Crawls every panel route with an authenticated session and reports
// any 404 / 500 responses. Run with: node scripts/crawl-routes.js
require('dotenv').config();
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL || 'owner@leaxos.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Leaxos2024!';

const ROUTES = [
  '/', '/login', '/register', '/setup', '/health',
  '/dashboard', '/monitoring', '/monitoring/metrics.json',
  '/backups', '/backups/create',
  '/domains', '/domains/create',
  '/website', '/website/create',
  '/apps', '/apps/create',
  '/file-manager',
  '/storage', '/storage/create',
  '/n8n', '/n8n/create',
  '/services', '/services/create',
  '/telegram', '/telegram/create',
  '/discord', '/discord/create',
  '/whatsapp', '/whatsapp/create',
  '/bots', '/bots/create',
  '/ai', '/ai/create',
  '/ai-settings',
  '/ai-hosting', '/ai-hosting/create',
  '/databases', '/databases/create',
  '/email', '/email/create',
  '/communication', '/communication/create',
  '/cloudflare', '/cloudflare/create',
  '/requests', '/requests/create',
  '/marketplace', '/marketplace/create',
  '/users', '/users/create', '/users/roles',
  '/security', '/security/audit', '/security-alerts',
  '/white-label', '/white-label/create',
  '/platform', '/platform/create',
  '/settings',
  '/profile',
  '/notifications',
  '/apikeys', '/apikeys/usage',
  '/doctor',
  '/templates', '/templates/blueprints',
  '/terminal', '/terminal/history',
  '/webview',
  '/workspaces', '/workspaces/owned', '/workspaces/dashboard',
  '/api/health', '/api/stats', '/api/resources'
];

const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/setup', '/health']);

function request(method, path, { headers = {}, body = null, cookies = '', timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        ...(cookies ? { Cookie: cookies } : {}),
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`timeout after ${timeout}ms`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCsrf(html) {
  const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
  return match ? match[1] : '';
}

function cookieHeader(setCookie, existing = '') {
  if (!setCookie) return existing;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const fresh = arr.map(c => c.split(';')[0]);
  const kept = existing
    ? existing.split('; ').filter(c => c && !fresh.some(f => f.split('=')[0] === c.split('=')[0]))
    : [];
  return [...kept, ...fresh].join('; ');
}

(async () => {
  console.log(`[crawl] Target: ${BASE}`);

  // 1. Load the login page to obtain a CSRF token and session cookie.
  const loginPage = await request('GET', '/login');
  const csrf = extractCsrf(loginPage.body);
  let cookies = cookieHeader(loginPage.headers['set-cookie']);
  console.log(`[crawl] Login page: ${loginPage.status}, csrf ${csrf ? 'ok' : 'MISSING'}`);

  // 2. Log in (form encoded POST with the CSRF token from the login page).
  const formBody = `email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}&_csrf=${encodeURIComponent(csrf)}`;
  const formLogin = await new Promise((resolve, reject) => {
    const url = new URL('/login', BASE);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: '/login', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formBody),
        ...(cookies ? { Cookie: cookies } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(formBody);
    req.end();
  });
  cookies = cookieHeader(formLogin.headers['set-cookie'], cookies);
  console.log(`[crawl] Login: ${formLogin.status} -> ${formLogin.headers.location || 'no redirect'}`);

  if (formLogin.status !== 302 || formLogin.headers.location !== '/dashboard') {
    console.error('[crawl] Login failed; authenticated routes were not crawled.');
    process.exitCode = 1;
    return;
  }

  // 3. Crawl.
  const failures = [];
  let ok = 0;
  let redirected = 0;

  for (const route of ROUTES) {
    try {
      const res = await request('GET', route, { cookies });
      const isRedirect = res.status >= 300 && res.status < 400;
      const isApi = route.startsWith('/api/');
      const requiresAuth = !PUBLIC_ROUTES.has(route);
      const redirectedToLogin = isRedirect && res.headers.location === '/login';

      if (res.status === 500 || (isApi && res.status >= 400 && route !== '/api/health')) {
        failures.push({ route, status: res.status, snippet: res.body.slice(0, 400).replace(/\s+/g, ' ') });
        console.log(`  FAIL ${route} -> ${res.status}`);
      } else if (redirectedToLogin && requiresAuth) {
        failures.push({ route, status: res.status, snippet: `Unexpected redirect to ${res.headers.location}` });
        console.log(`  FAIL ${route} -> ${res.status} ${res.headers.location}`);
      } else if (isRedirect) {
        redirected++;
        console.log(`  REDIR ${route} -> ${res.status} ${res.headers.location}`);
      } else if (res.status === 200) {
        ok++;
      } else {
        failures.push({ route, status: res.status, snippet: res.body.slice(0, 300).replace(/\s+/g, ' ') });
        console.log(`  WARN ${route} -> ${res.status}`);
      }
    } catch (err) {
      failures.push({ route, status: 'ERR', snippet: err.message });
      console.log(`  ERR  ${route} -> ${err.message}`);
    }
  }

  console.log('');
  console.log(`[crawl] ${ok} OK, ${redirected} redirected, ${failures.length} problems`);

  if (failures.length) {
    console.log('');
    for (const f of failures) {
      console.log(`--- ${f.route} (${f.status})`);
      console.log(f.snippet);
      console.log('');
    }
    process.exitCode = 1;
  }
})().catch(err => {
  console.error('[crawl] fatal:', err);
  process.exit(1);
});

