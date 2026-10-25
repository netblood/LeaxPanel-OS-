import net from 'node:net'
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkTcpEndpoint } from './dependencies.mjs'

test('detects a reachable TCP dependency', async () => {
  const listener = net.createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => listener.once('listening', resolve))
  const address = listener.address()
  const result = await checkTcpEndpoint({ host: '127.0.0.1', port: address.port })
  listener.close()
  assert.deepEqual(result, { ok: true })
})

test('reports an unavailable TCP dependency', async () => {
  const listener = net.createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => listener.once('listening', resolve))
  const address = listener.address()
  await new Promise(resolve => listener.close(resolve))
  const result = await checkTcpEndpoint({ host: '127.0.0.1', port: address.port, timeoutMs: 100 })
  assert.equal(result.ok, false)
})
