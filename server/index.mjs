import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertValidEnv, getRuntimeEnv, validateEnv } from './env.mjs'
import { generateCompose, templateCatalog } from './compose-generator.mjs'
import { clearSessionCookie, createSessionToken, getSession, sessionCookie } from './auth.mjs'
import { checkRuntimeDependencies } from './dependencies.mjs'
import { deployProject, docker, inspectStats, listContainers, listNetworks, listVolumes, validateGeneratedCompose } from './docker.mjs'

const env = getRuntimeEnv()
const port = Number(env.PORT || 8787)
const allowedOrigin = env.APP_URL || 'http://localhost:5173'
const staticDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const contentTypes = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.html': 'text/html; charset=utf-8' }

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': allowedOrigin })
  response.end(JSON.stringify(payload))
}

function sendText(response, status, text) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': allowedOrigin })
  response.end(text)
}

async function sendDockerResult(response, action) {
  try {
    return sendJson(response, 200, await action())
  } catch (error) {
    return sendJson(response, error.code === 'DOCKER_NOT_AVAILABLE' ? 503 : 422, { ok: false, code: error.code || 'DOCKER_COMMAND_FAILED', error: error.message })
  }
}

function serveStatic(url, response) {
  if (url.pathname === '/health') return sendText(response, 200, 'ok')
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
  const candidate = path.resolve(staticDirectory, `.${requested}`)
  const insideStaticDirectory = candidate === path.resolve(staticDirectory) || candidate.startsWith(`${path.resolve(staticDirectory)}${path.sep}`)
  if (!insideStaticDirectory) return sendText(response, 403, 'Forbidden')
  const filePath = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(staticDirectory, 'index.html')
  if (!fs.existsSync(filePath)) return sendText(response, 404, 'Frontend build not found')
  const extension = path.extname(filePath)
  response.writeHead(200, { 'content-type': contentTypes[extension] || 'application/octet-stream', 'cache-control': extension === '.html' ? 'no-store' : 'public, max-age=31536000' })
  response.end(fs.readFileSync(filePath))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 1024 * 1024) throw new Error('Request body is too large')
  }
  if (!body) return {}
  return JSON.parse(body)
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': allowedOrigin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' })
    response.end()
    return
  }
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  try {
    if (request.method === 'GET' && url.pathname === '/api/health/live') return sendJson(response, 200, { ok: true, service: 'leaxpanel' })
    if (request.method === 'GET' && url.pathname === '/api/health/ready') {
      const validation = validateEnv(env)
      if (!validation.valid) return sendJson(response, 503, { ok: false, checks: { environment: validation } })
      try {
        const dependencies = await checkRuntimeDependencies(env)
        return sendJson(response, 200, { ok: true, checks: { environment: validation, dependencies } })
      } catch (error) {
        return sendJson(response, 503, { ok: false, checks: { environment: validation }, error: error.message })
      }
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(request)
      if (body.email !== env.ADMIN_EMAIL || body.password !== env.ADMIN_PASSWORD) return sendJson(response, 401, { ok: false, error: 'Invalid credentials' })
      const secure = String(env.APP_URL).startsWith('https://')
      response.setHeader('set-cookie', sessionCookie(createSessionToken({ email: env.ADMIN_EMAIL, secret: env.COOKIE_SECRET }), secure))
      return sendJson(response, 200, { ok: true, user: { email: env.ADMIN_EMAIL, role: 'admin' } })
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      const session = getSession(request, env.COOKIE_SECRET)
      return session ? sendJson(response, 200, { ok: true, user: { email: session.email, role: session.role } }) : sendJson(response, 200, { ok: false, error: 'Authentication required' })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      response.setHeader('set-cookie', clearSessionCookie())
      return sendJson(response, 200, { ok: true })
    }
    if (request.method === 'GET' && url.pathname === '/api/templates') return sendJson(response, 200, { templates: templateCatalog })
    if (request.method === 'GET' && url.pathname === '/api/runtime/status') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      try {
        const version = await docker(['version', '--format', '{{.Server.Version}}'])
        return sendJson(response, 200, { ok: true, available: true, version })
      } catch (error) {
        return sendJson(response, 200, { ok: true, available: false, code: error.code || 'DOCKER_UNAVAILABLE', message: error.message })
      }
    }
    if (request.method === 'GET' && url.pathname === '/api/runtime/containers') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      return sendDockerResult(response, async () => ({ containers: await listContainers() }))
    }
    if (request.method === 'GET' && url.pathname === '/api/runtime/volumes') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      return sendDockerResult(response, async () => ({ volumes: await listVolumes() }))
    }
    if (request.method === 'GET' && url.pathname === '/api/runtime/networks') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      return sendDockerResult(response, async () => ({ networks: await listNetworks() }))
    }
    if (request.method === 'GET' && url.pathname === '/api/runtime/stats') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      return sendDockerResult(response, async () => ({ stats: await inspectStats() }))
    }
    if (request.method === 'POST' && url.pathname === '/api/compose/validate') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      try {
        return sendJson(response, 200, await validateGeneratedCompose(await readJson(request)))
      } catch (error) {
        return sendJson(response, error.code === 'DOCKER_NOT_AVAILABLE' ? 503 : 422, { ok: false, code: error.code || 'COMPOSE_VALIDATION_FAILED', error: error.message })
      }
    }
    if (request.method === 'POST' && url.pathname === '/api/compose/generate') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      const result = generateCompose(await readJson(request))
      return sendJson(response, 200, result)
    }
    if (request.method === 'POST' && url.pathname === '/api/deploy') {
      if (!getSession(request, env.COOKIE_SECRET)) return sendJson(response, 401, { ok: false, error: 'Authentication required' })
      try {
        return sendJson(response, 200, await deployProject(await readJson(request)))
      } catch (error) {
        return sendJson(response, error.code === 'DOCKER_NOT_AVAILABLE' ? 503 : 422, { ok: false, code: error.code || 'DEPLOYMENT_FAILED', error: error.message })
      }
    }
    if (request.method === 'GET' && url.pathname === '/api') return sendJson(response, 200, { service: 'leaxpanel-api', endpoints: ['/api/health/live', '/api/health/ready', '/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/templates', '/api/runtime/containers', '/api/runtime/volumes', '/api/runtime/networks', '/api/runtime/stats', '/api/compose/generate', '/api/compose/validate', '/api/deploy'] })
    if (request.method === 'GET' && !url.pathname.startsWith('/api/')) return serveStatic(url, response)
    return sendText(response, 404, 'Not found')
  } catch (error) {
    return sendJson(response, error instanceof SyntaxError ? 400 : 422, { ok: false, error: error.message })
  }
})

try {
  assertValidEnv(env)
  if (env.LEAXPANEL_DEV_PREVIEW === '1') {
    console.warn('LeaxPanel development preview: PostgreSQL/Redis startup checks are reported but not required for local UI preview.')
    server.listen(port, () => console.log(`LeaxPanel API listening on http://127.0.0.1:${port} (preview)`))
  } else {
    const dependencyChecks = await checkRuntimeDependencies(env)
    server.listen(port, () => console.log(`LeaxPanel API listening on http://127.0.0.1:${port}`, dependencyChecks))
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
