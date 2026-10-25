import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { projectRoot } from './env.mjs'
import { generateCompose } from './compose-generator.mjs'

const execFileAsync = promisify(execFile)
const projectDirectory = path.join(projectRoot, 'projects')

function dockerError(error) {
  if (error?.code === 'ENOENT') {
    const result = new Error('Docker CLI is not installed or is not available on PATH')
    result.code = 'DOCKER_NOT_AVAILABLE'
    return result
  }
  const result = new Error(error?.stderr?.trim() || error?.message || 'Docker command failed')
  result.code = 'DOCKER_COMMAND_FAILED'
  return result
}

export async function docker(args, { timeout = 30_000 } = {}) {
  try {
    const result = await execFileAsync('docker', args, { cwd: projectRoot, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
    return result.stdout.trim()
  } catch (error) {
    throw dockerError(error)
  }
}

export async function validateComposeFile(filePath) {
  await docker(['compose', '-f', filePath, 'config', '--quiet'])
  return { valid: true, filePath }
}

export async function validateGeneratedCompose(input) {
  const generated = generateCompose(input)
  fs.mkdirSync(projectDirectory, { recursive: true })
  const validationDirectory = fs.mkdtempSync(path.join(projectDirectory, '.validation-'))
  const composePath = path.join(validationDirectory, 'docker-compose.yml')
  try {
    fs.writeFileSync(composePath, generated.yaml, 'utf8')
    await validateComposeFile(composePath)
    return { ...generated, validation: { valid: true } }
  } finally {
    fs.rmSync(validationDirectory, { recursive: true, force: true })
  }
}

export async function listContainers() {
  const output = await docker(['ps', '-a', '--format', '{{json .}}'])
  return output ? output.split(/\r?\n/u).map(line => JSON.parse(line)) : []
}

export async function listVolumes() {
  const output = await docker(['volume', 'ls', '--format', '{{json .}}'])
  return output ? output.split(/\r?\n/u).map(line => JSON.parse(line)) : []
}

export async function listNetworks() {
  const output = await docker(['network', 'ls', '--format', '{{json .}}'])
  return output ? output.split(/\r?\n/u).map(line => JSON.parse(line)) : []
}

export async function inspectStats() {
  const output = await docker(['stats', '--no-stream', '--format', '{{json .}}'])
  return output ? output.split(/\r?\n/u).map(line => JSON.parse(line)) : []
}

export async function deployProject(input) {
  const generated = generateCompose(input)
  fs.mkdirSync(projectDirectory, { recursive: true })
  const projectPath = path.join(projectDirectory, generated.projectName)
  fs.mkdirSync(projectPath, { recursive: true })
  const composePath = path.join(projectPath, 'docker-compose.yml')
  fs.writeFileSync(composePath, generated.yaml, 'utf8')
  await validateComposeFile(composePath)
  try {
    await docker(['network', 'inspect', 'leaxpanel'])
  } catch (error) {
    if (error.code !== 'DOCKER_COMMAND_FAILED') throw error
    await docker(['network', 'create', '--driver', 'bridge', 'leaxpanel'])
  }
  await docker(['compose', '-p', generated.projectName, '-f', composePath, 'up', '-d', '--remove-orphans'], { timeout: 120_000 })
  return { ...generated, composePath, deployed: true }
}
