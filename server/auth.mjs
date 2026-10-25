import crypto from 'node:crypto'

const cookieName = 'leaxpanel_session'
const sessionLifetimeSeconds = 60 * 60 * 12

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSessionToken({ email, secret, now = Date.now() }) {
  const payload = base64url(JSON.stringify({ email, role: 'admin', exp: Math.floor(now / 1000) + sessionLifetimeSeconds }))
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null
  const [payload, signature] = token.split('.')
  const expected = Buffer.from(sign(payload || '', secret))
  const actual = Buffer.from(signature || '')
  if (!payload || !signature || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed.email || parsed.role !== 'admin' || parsed.exp <= Math.floor(now / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split('=').map(decodeURIComponent)).filter(([key, value]) => key && value))
}

export function sessionCookie(token, secure = false) {
  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeSeconds}${secure ? '; Secure' : ''}`
}

export function clearSessionCookie() {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

export function getSession(request, secret) {
  const cookies = parseCookies(request.headers.cookie)
  return verifySessionToken(cookies[cookieName], secret)
}

export { cookieName }
