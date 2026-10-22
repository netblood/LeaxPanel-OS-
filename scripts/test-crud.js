// Exercises the full CRUD cycle for every module through the real HTTP
// endpoints (forms, CSRF, redirects). Run with: node scripts/test-crud.js
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL || 'owner@leaxos.local';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Leaxos2024!';

let cookies = '';

function request(method, path, { body = null, form = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = form ? new URLSearchParams(form).toString()
      : body ? JSON.stringify(body) : null;
    const headers = {};
    if (cookies) headers.Cookie = cookies;
    if (payload) {
      headers['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
          const fresh = arr.map(c => c.split(';')[0]);
          const merged = cookies ? cookies.split('; ').filter(c => !fresh.some(f => c.split('=')[0] === f.split('=')[0])) : [];
          cookies = [...merged, ...fresh].join('; ');
        }
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function csrfFrom(html) {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/);
  return m ? m[1] : '';
}

const MODULES = [
  { prefix: 'apps', post: { name: 'test-app', type: 'nodejs', port: '3001', status: 'pending' } },
  { prefix: 'domains', post: { name: 'test.example.com', status: 'pending' } },
  { prefix: 'website', post: { name: 'test-site', domain: 'test.example.com', platform: 'static', status: 'active' } },
  { prefix: 'databases', post: { name: 'test-db', type: 'sqlite', host: '127.0.0.1', status: 'active' } },
  { prefix: 'storage', post: { name: 'test-bucket', region: 'local', status: 'active' } },
  { prefix: 'communication', post: { name: 'test-channel', type: 'webhook', status: 'active' } },
  { prefix: 'whatsapp', post: { name: 'test-wa', phone_number: '+212600000000', status: 'disconnected' } },
  { prefix: 'discord', post: { name: 'test-discord', status: 'stopped', guild_count: '0' } },
  { prefix: 'telegram', post: { name: 'test-telegram', username: '@testbot', status: 'stopped' } },
  { prefix: 'n8n', post: { name: 'test-workflow', status: 'inactive', workflow_data: '{}' } },
  { prefix: 'email', post: { name: 'test-mail', email_address: 'test@example.com', provider: 'custom', status: 'active' } },
  { prefix: 'cloudflare', post: { name: 'test-zone', zone_id: 'abc123', plan: 'free', status: 'pending' } },
  { prefix: 'ai-hosting', post: { name: 'test-ai', model: 'gpt-4o-mini', status: 'pending' } },
  { prefix: 'marketplace', post: { name: 'test-item', category: 'other', price: '10', currency: 'USD', status: 'active' } },
  { prefix: 'bots', post: { name: 'test-bot', type: 'telegram', status: 'stopped', config: '{}' } },
  { prefix: 'ai', post: { name: 'test-agent', type: 'custom', model: 'gpt-4o-mini', status: 'inactive', config: '{}' } },
  { prefix: 'services', post: { name: 'test-service', type: 'nodejs', status: 'active', config: '{}' } },
  { prefix: 'requests', post: { subject: 'Test request', description: 'Testing', priority: 'normal', status: 'open' } }
];

let pass = 0;
let fail = 0;

function report(label, ok, detail = '') {
  if (ok) { pass++; console.log(`  [OK  ] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}${detail ? ` - ${detail}` : ''}`); }
}

(async () => {
  console.log(`[crud] Target: ${BASE}`);

  const loginPage = await request('GET', '/login');
  const csrf = csrfFrom(loginPage.body);
  await request('POST', '/login', { form: { email: EMAIL, password: PASSWORD, _csrf: csrf } });
  console.log('[crud] logged in\n');

  for (const mod of MODULES) {
    const listPage = await request('GET', `/${mod.prefix}`);
    const token = csrfFrom(listPage.body) || csrf;

    // CREATE
    const createRes = await request('POST', `/${mod.prefix}/create`, { form: { ...mod.post, _csrf: token } });
    const created = createRes.status === 302 && (createRes.headers.location || '').includes(mod.prefix);
    report(`create ${mod.prefix}`, created, `status=${createRes.status} loc=${createRes.headers.location}`);

    if (!created) continue;

    // Find the new record id from the list page
    const afterCreate = await request('GET', `/${mod.prefix}`);
    const idMatch = afterCreate.body.match(new RegExp(`/${mod.prefix}/(\\d+)/edit`));
    const id = idMatch ? idMatch[1] : null;
    report(`list ${mod.prefix} shows record`, !!id);

    if (!id) continue;

    // EDIT
    const editPage = await request('GET', `/${mod.prefix}/${id}/edit`);
    const editToken = csrfFrom(editPage.body) || token;
    const editRes = await request('POST', `/${mod.prefix}/${id}/edit`, { form: { ...mod.post, _csrf: editToken } });
    report(`edit ${mod.prefix}/${id}`, editRes.status === 302, `status=${editRes.status}`);

    // SHOW
    const showRes = await request('GET', `/${mod.prefix}/${id}`);
    report(`show ${mod.prefix}/${id}`, showRes.status === 200, `status=${showRes.status}`);

    // DELETE
    const delRes = await request('POST', `/${mod.prefix}/${id}/delete`, { form: { _csrf: editToken } });
    report(`delete ${mod.prefix}/${id}`, delRes.status === 302, `status=${delRes.status}`);
  }

  console.log('');
  console.log(`[crud] ${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
})().catch(err => {
  console.error('[crud] fatal:', err);
  process.exit(1);
});
