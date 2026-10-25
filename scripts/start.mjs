import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadEnvFile, validateEnv } from '../server/env.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

if (!fs.existsSync(viteEntry)) {
  console.error('LeaxPanel dependencies are missing. Run npm install, then run npm start again.')
  process.exit(1)
}

function createDevelopmentEnv() {
  const password = crypto.randomBytes(18).toString('base64url')
  const secret = () => crypto.randomBytes(32).toString('base64url')
  return {
    ADMIN_EMAIL: 'admin@example.local',
    ADMIN_PASSWORD: password,
    JWT_SECRET: secret(),
    SESSION_SECRET: secret(),
    COOKIE_SECRET: secret(),
    DATABASE_URL: 'postgresql://leaxpanel:dev-only@127.0.0.1:5432/leaxpanel',
    REDIS_URL: 'redis://127.0.0.1:6379',
    APP_URL: 'http://127.0.0.1:5173',
    APP_DOMAIN: 'panel.localhost',
    TRAEFIK_EMAIL: 'dev@localhost',
    POSTGRES_DB: 'leaxpanel',
    POSTGRES_USER: 'leaxpanel',
    POSTGRES_PASSWORD: 'dev-only',
  }
}

const envPath = path.join(root, '.env')
const fileValues = loadEnvFile(envPath)
const fileValidation = validateEnv({ ...fileValues, ...process.env })
let previewEnvironment = process.env
if (!fileValidation.valid) {
  if (fileValidation.invalid.length > 0) {
    console.error('LeaxPanel cannot start because .env contains invalid values:')
    for (const issue of fileValidation.invalid) console.error(`- ${issue}`)
    process.exit(1)
  }
  const generated = createDevelopmentEnv()
  previewEnvironment = { ...process.env, ...generated }
  console.log('Using generated local preview credentials because required .env values are missing.')
  console.log('Existing .env was not overwritten.')
  console.log(`Admin email: ${generated.ADMIN_EMAIL}`)
  console.log(`Admin password: ${generated.ADMIN_PASSWORD}`)
}

const processes = [
  spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], { cwd: root, stdio: 'inherit', env: { ...previewEnvironment, LEAXPANEL_DEV_PREVIEW: '1' } }),
  spawn(process.execPath, [viteEntry, '--host', '127.0.0.1'], { cwd: root, stdio: 'inherit', env: previewEnvironment }),
]

let shuttingDown = false
const stopAll = code => {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of processes) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 250)
}

for (const child of processes) child.once('exit', code => { if (!shuttingDown && code && code !== 0) stopAll(code) })
process.once('SIGINT', () => stopAll(0))
process.once('SIGTERM', () => stopAll(0))

console.log('LeaxPanel startup launched: API http://127.0.0.1:8787 and UI http://127.0.0.1:5173')
