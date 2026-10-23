// Focused panel verification: logs in with a real form + CSRF, then checks
// specific routes for status codes, content type and server-error markers.
// Run with: node scripts/verify-panel.js
require('dotenv').config();
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

function request(method, path, { headers = {}, body = null, cookies = '' } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        ...(cookies ? { Cookie: cookies } : {}),
        ...(body ? {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        } : {}),
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractCsrf(html) {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/);
  return m ? m[1] : '';
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

const CHECKS = [
  { path: '/dashboard', expect: 200, type: 'html' },
  { path: '/workspaces', expect: 200, type: 'json' },
  { path: '/workspaces/dashboard', expect: 200, type: 'json' },
  { path: '/workspaces/dashboard/summary', expect: 200, type: 'json' },
  { path: '/workspaces/dashboard/service/website', expect: 403, type: 'json' },
  { path: '/workspaces/owned', expect: 200, type: 'json' },
  { path: '/templates/blueprints', expect: 200, type: 'html' },
  { path: '/templates', expect: 200, type: 'html' },
  { path: '/security-alerts', expect: 200, type: 'html' },
  { path: '/users', expect: 200, type: 'html' },
  { path: '/settings', expect: 200, type: 'html' },
  { path: '/api/health', expect: 200, type: 'json' },
  { path: '/css/style.css', expect: 200, type: 'css' },
  { path: '/js/main.js', expect: 200, type: 'js' }
];

(async () => {
  const loginPage = await request('GET', '/login');
  const csrf = extractCsrf(loginPage.body);
  let cookies = cookieHeader(loginPage.headers['set-cookie']);
  console.log(`[verify] login page ${loginPage.status}, csrf=${csrf ? 'ok' : 'MISSING'}`);

  const body = `email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}&_csrf=${encodeURIComponent(csrf)}`;
  const login = await request('POST', '/login', { body, cookies });
  cookies = cookieHeader(login.headers['set-cookie'], cookies);
  console.log(`[verify] login ${login.status} -> ${login.headers.location || 'no redirect'}`);
  if (login.status !== 302) {
    console.error('[verify] LOGIN FAILED');
    process.exitCode = 1;
    return;
  }

  let pass = 0;
  let fail = 0;
  for (const c of CHECKS) {
    const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
    let res;
    try {
      res = await request('GET', c.path, { cookies });
    } catch (e) {
      console.log(`  FAIL ${c.path} -> request error: ${e.message}`);
      fail++;
      continue;
    }
    const ct = res.headers['content-type'] || '';
    const hasServerError = /ReferenceError|TypeError|SyntaxError|is not defined|Cannot read propert/i.test(res.body);
    const typeOk = c.type === 'html'
      ? ct.includes('text/html')
      : c.type === 'json'
        ? ct.includes('application/json')
        : true;
    const ok = expected.includes(res.status) && typeOk && !hasServerError;
    if (ok) {
      pass++;
      console.log(`  PASS ${c.path} -> ${res.status} ${ct.split(';')[0]} (${res.body.length}b)`);
    } else {
      fail++;
      console.log(`  FAIL ${c.path} -> ${res.status} ${ct.split(';')[0]} (expected ${expected.join('/')} ${c.type})`);
      if (hasServerError) {
        const m = res.body.match(/(ReferenceError|TypeError|SyntaxError)[^\n<]{0,200}/);
        console.log(`       server error marker: ${m ? m[0].trim() : 'found'}`);
      }
      if (res.status >= 500) {
        console.log(`       body: ${res.body.slice(0, 400).replace(/\s+/g, ' ')}`);
      }
    }
  }
  console.log(`[verify] ${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
})();
