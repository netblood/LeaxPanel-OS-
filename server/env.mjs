import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')

export const REQUIRED_ENV = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'APP_URL',
]

function unquote(value) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseEnv(text) {
  const values = {}
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).split(' #')[0]
    values[key] = unquote(value)
  }
  return values
}

export function loadEnvFile(filePath = path.join(projectRoot, '.env')) {
  if (!fs.existsSync(filePath)) return {}
  return parseEnv(fs.readFileSync(filePath, 'utf8'))
}

export function getRuntimeEnv({ source = process.env, filePath } = {}) {
  const fileValues = loadEnvFile(filePath)
  return { ...fileValues, ...source }
}

export function validateEnv(env) {
  const missing = REQUIRED_ENV.filter(key => !String(env[key] ?? '').trim())
  const invalid = []
  if (env.ADMIN_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(env.ADMIN_EMAIL)) invalid.push('ADMIN_EMAIL must be a valid email')
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) invalid.push('JWT_SECRET must be at least 32 characters')
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) invalid.push('SESSION_SECRET must be at least 32 characters')
  if (env.COOKIE_SECRET && env.COOKIE_SECRET.length < 32) invalid.push('COOKIE_SECRET must be at least 32 characters')
  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://') && !env.DATABASE_URL.startsWith('postgres://')) invalid.push('DATABASE_URL must use PostgreSQL')
  if (env.REDIS_URL && !env.REDIS_URL.startsWith('redis://') && !env.REDIS_URL.startsWith('rediss://')) invalid.push('REDIS_URL must use Redis')
  if (env.APP_URL) {
    try { new URL(env.APP_URL) } catch { invalid.push('APP_URL must be an absolute URL') }
  }
  return { valid: missing.length === 0 && invalid.length === 0, missing, invalid }
}

export function assertValidEnv(env) {
  const result = validateEnv(env)
  if (!result.valid) {
    const details = [...result.missing.map(key => `${key} is missing`), ...result.invalid]
    throw new Error(`Environment validation failed:\n- ${details.join('\n- ')}`)
  }
  return env
}

export { projectRoot }
