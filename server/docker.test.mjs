import test from 'node:test'
import assert from 'node:assert/strict'
import { docker } from './docker.mjs'

test('returns a typed error when Docker is unavailable', async () => {
  await assert.rejects(() => docker(['--version']), error => {
    assert.ok(['DOCKER_NOT_AVAILABLE', 'DOCKER_COMMAND_FAILED'].includes(error.code))
    return true
  })
})
