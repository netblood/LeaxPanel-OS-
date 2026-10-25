import net from 'node:net'
import { spawn } from 'node:child_process'
import test from 'node:test'
import assert from 'node:assert/strict'

async function openDependency() {
  const server = net.createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  return { server, port: server.address().port }
}

async function freePort() {
  const listener = net.createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => listener.once('listening', resolve))
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  return port
}

async function openApi(env) {
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API startup timed out')), 5000)
    const onOutput = chunk => {
      if (chunk.toString().includes('LeaxPanel API listening')) {
        clearTimeout(timeout)
        resolve()
      }
    }
    child.stdout.on('data', onOutput)
    child.stderr.on('data', onOutput)
    child.once('error', reject)
    child.once('exit', code => code !== 0 && reject(new Error(`API exited with ${code}`)))
  })
  return child
}

test('serves protected compose generation behind the auth boundary', async t => {
  const postgres = await openDependency()
  const redis = await openDependency()
  const apiPort = await freePort()
  const env = {
    PORT: String(apiPort),
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'test-password',
    JWT_SECRET: '12345678901234567890123456789012',
    SESSION_SECRET: '12345678901234567890123456789012',
    COOKIE_SECRET: '12345678901234567890123456789012',
    DATABASE_URL: `postgresql://user:pass@127.0.0.1:${postgres.port}/leaxpanel`,
    REDIS_URL: `redis://127.0.0.1:${redis.port}`,
    APP_URL: `http://127.0.0.1:${apiPort}`,
  }
  const api = await openApi(env)
  t.after(() => { api.kill(); postgres.server.close(); redis.server.close() })

  const live = await fetch(`http://127.0.0.1:${apiPort}/api/health/live`)
  assert.equal(live.status, 200)
  const unauthorized = await fetch(`http://127.0.0.1:${apiPort}/api/compose/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'node', projectName: 'private' }) })
  assert.equal(unauthorized.status, 401)

  const login = await fetch(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const compose = await fetch(`http://127.0.0.1:${apiPort}/api/compose/generate`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ type: 'node', projectName: 'private' }) })
  assert.equal(compose.status, 200)
  assert.match((await compose.json()).yaml, /services:/)
  const frontend = await fetch(`http://127.0.0.1:${apiPort}/`)
  assert.equal(frontend.status, 200)
  assert.match(await frontend.text(), /LeaxPanel/)
})
