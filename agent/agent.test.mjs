import test from 'node:test'
import assert from 'node:assert/strict'

test('LeaxAgent runtime contract requires node identity and token configuration', () => {
  assert.deepEqual(['LEAX_AGENT_NODE_ID', 'LEAX_AGENT_TOKEN', 'LEAX_AGENT_CORE_URL'].sort(), ['LEAX_AGENT_CORE_URL', 'LEAX_AGENT_NODE_ID', 'LEAX_AGENT_TOKEN'].sort())
})
