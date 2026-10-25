import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCompose } from './compose-generator.mjs'

for (const type of ['node', 'python', 'n8n']) {
  test(`generates a valid ${type} compose template boundary`, () => {
    const result = generateCompose({ type, projectName: 'Client Website', domain: 'client.example.com' })
    assert.equal(result.projectName, 'client-website')
    assert.equal(result.domain, 'client.example.com')
    assert.match(result.yaml, /services:/)
    assert.match(result.yaml, /traefik\.enable: "true"/)
    assert.doesNotMatch(result.yaml, /change-me/)
  })
}

test('rejects unsupported compose template types', () => {
  assert.throws(() => generateCompose({ type: 'kubernetes', projectName: 'bad' }), /Unsupported project type/)
})

test('rejects unsafe deployment values', () => {
  assert.throws(() => generateCompose({ type: 'node', projectName: 'safe', domain: 'bad.example.com\nHost(evil)' }), /domain must be a hostname/)
  assert.throws(() => generateCompose({ type: 'node', projectName: 'safe', memoryLimit: '512m;rm' }), /memoryLimit must use/)
  assert.throws(() => generateCompose({ type: 'node', projectName: 'safe', port: 70000 }), /port must be an integer/)
})
