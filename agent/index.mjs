import http from 'node:http'
import os from 'node:os'
import crypto from 'node:crypto'

const required = ['LEAX_AGENT_NODE_ID', 'LEAX_AGENT_TOKEN', 'LEAX_AGENT_CORE_URL']
const missing = required.filter(key => !String(process.env[key] || '').trim())
if (missing.length > 0) {
  console.error(`LeaxAgent cannot start. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

const nodeId = process.env.LEAX_AGENT_NODE_ID
const token = process.env.LEAX_AGENT_TOKEN
const port = Number(process.env.LEAX_AGENT_PORT || 9090)
const coreUrl = process.env.LEAX_AGENT_CORE_URL
const startedAt = new Date().toISOString()

function authorized(request) {
  const received = String(request.headers.authorization || '').replace(/^Bearer\s+/u, '')
  const expected = Buffer.from(token)
  const actual = Buffer.from(received)
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

const agent = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/health') return json(response, 200, { ok: true, nodeId, service: 'leaxagent', startedAt })
  if (!authorized(request)) return json(response, 401, { ok: false, error: 'Agent token required' })
  if (request.method === 'GET' && url.pathname === '/v1/capabilities') return json(response, 200, { nodeId, coreUrl, capabilities: ['container-management', 'file-operations', 'console-stream', 'metrics', 'backups', 'ssl-tasks', 'network-tasks'], transport: ['https', 'websocket'] })
  if (request.method === 'GET' && url.pathname === '/v1/metrics') return json(response, 200, { nodeId, cpuCount: os.cpus().length, loadAverage: os.loadavg(), memory: { total: os.totalmem(), free: os.freemem(), used: os.totalmem() - os.freemem() }, uptime: os.uptime() })
  if (request.method === 'POST' && url.pathname === '/v1/actions') return json(response, 202, { ok: true, nodeId, accepted: true, message: 'Action queued for the LeaxAgent worker.' })
  return json(response, 404, { ok: false, error: 'Not found' })
})

agent.listen(port, () => console.log(`LeaxAgent ${nodeId} listening on http://127.0.0.1:${port}`))
