import fs from 'node:fs'
import path from 'node:path'
import { projectRoot } from './env.mjs'

const templateDirectory = path.join(projectRoot, 'docker', 'compose-templates')
const templateFiles = { node: 'node.yml', python: 'python.yml', n8n: 'n8n.yml' }

export const templateCatalog = [
  { type: 'node', name: 'Node.js App', description: 'A resource-capped Node.js application with optional Redis.', defaultPort: 3000, optionalServices: ['redis'] },
  { type: 'python', name: 'Python API', description: 'A lean Python service with optional PostgreSQL.', defaultPort: 8000, optionalServices: ['postgres'] },
  { type: 'n8n', name: 'n8n Instance', description: 'n8n with PostgreSQL persistence and a Traefik route.', defaultPort: 5678, optionalServices: [], },
]

function safeName(value) {
  const result = String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48)
  return result || 'leax-project'
}

function safeDomain(value, fallback) {
  const domain = String(value || fallback).trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(domain) || domain.includes('..')) throw new Error('domain must be a hostname without spaces or special characters')
  return domain
}

function safeMemoryLimit(value, fallback) {
  const memory = String(value || fallback).trim().toLowerCase()
  if (!/^\d+(?:m|g)$/u.test(memory)) throw new Error('memoryLimit must use a value such as 256m or 1g')
  return memory
}

function safePort(value, fallback) {
  const port = Number(value || fallback)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be an integer between 1 and 65535')
  return String(port)
}

function replaceDefault(text, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return text.replace(new RegExp(`\\$\\{${escapedKey}:-[^}]+\\}`, 'gu'), value)
}

export function generateCompose({ type, projectName, projectPath = '.', envFile = '.env', domain, memoryLimit, port } = {}) {
  if (!templateFiles[type]) throw new Error(`Unsupported project type: ${type}`)
  const template = fs.readFileSync(path.join(templateDirectory, templateFiles[type]), 'utf8')
  const catalogEntry = templateCatalog.find(item => item.type === type)
  const name = safeName(projectName)
  const defaults = {
    'PROJECT_PATH': String(projectPath).replace(/[\r\n]/gu, ''),
    'ENV_FILE': String(envFile).replace(/[\r\n]/gu, ''),
    'APP_NAME': name,
    'APP_DOMAIN': safeDomain(domain, `${name}.localhost`),
    'APP_MEMORY_LIMIT': safeMemoryLimit(memoryLimit, type === 'n8n' ? '768m' : '512m'),
    'APP_PORT': safePort(port, catalogEntry.defaultPort),
    'POSTGRES_DB': type === 'n8n' ? `${name}_n8n` : `${name}_app`,
    'POSTGRES_USER': type === 'n8n' ? `${name}_n8n` : `${name}_app`,
    'EXECUTIONS_DATA_MAX_AGE': '168',
  }
  let output = template
  for (const [key, value] of Object.entries(defaults)) output = replaceDefault(output, key, value)
  return { type, projectName: name, domain: defaults.APP_DOMAIN, memoryLimit: defaults.APP_MEMORY_LIMIT, port: defaults.APP_PORT, yaml: output }
}
