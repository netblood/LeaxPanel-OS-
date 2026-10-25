import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionToken, parseCookies, sessionCookie, verifySessionToken } from './auth.mjs'

const secret = '12345678901234567890123456789012'
const now = 1_700_000_000_000

test('creates and verifies an admin session token', () => {
  const token = createSessionToken({ email: 'admin@example.com', secret, now })
  assert.deepEqual(verifySessionToken(token, secret, now), { email: 'admin@example.com', role: 'admin', exp: Math.floor(now / 1000) + 43200 })
})

test('rejects tampered and expired sessions', () => {
  const token = createSessionToken({ email: 'admin@example.com', secret, now })
  assert.equal(verifySessionToken(`${token}x`, secret, now), null)
  assert.equal(verifySessionToken(token, secret, now + 43201 * 1000), null)
})

test('serializes session cookies without exposing credentials', () => {
  const cookies = parseCookies(sessionCookie('signed-token'))
  assert.equal(cookies.leaxpanel_session, 'signed-token')
  assert.doesNotMatch(sessionCookie('signed-token'), /admin|password/iu)
})
