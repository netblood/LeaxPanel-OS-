import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv, validateEnv } from './env.mjs'

const validEnv = {
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'a-secure-password',
  JWT_SECRET: '12345678901234567890123456789012',
  SESSION_SECRET: '12345678901234567890123456789012',
  COOKIE_SECRET: '12345678901234567890123456789012',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/leaxpanel',
  REDIS_URL: 'redis://localhost:6379',
  APP_URL: 'http://localhost:5173',
}

test('parses dotenv values without overwriting the key name', () => {
  assert.deepEqual(parseEnv('APP_URL="http://localhost:5173"\n# comment\nEMPTY=\n'), { APP_URL: 'http://localhost:5173', EMPTY: '' })
})

test('accepts a complete valid environment contract', () => {
  assert.deepEqual(validateEnv(validEnv), { valid: true, missing: [], invalid: [] })
})

test('reports missing and invalid environment values', () => {
  const result = validateEnv({ ...validEnv, JWT_SECRET: 'short', DATABASE_URL: 'sqlite://local', ADMIN_EMAIL: 'bad' })
  assert.equal(result.valid, false)
  assert.match(result.invalid.join(' '), /JWT_SECRET/)
  assert.match(result.invalid.join(' '), /DATABASE_URL/)
  assert.match(result.invalid.join(' '), /ADMIN_EMAIL/)
})
