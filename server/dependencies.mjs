import net from 'node:net'

function endpointFromUrl(value, fallbackPort) {
  const parsed = new URL(value)
  return { host: parsed.hostname, port: Number(parsed.port || fallbackPort) }
}

export function checkTcpEndpoint({ host, port, timeoutMs = 1200 }) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port })
    const finish = result => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(timeoutMs, () => finish({ ok: false, reason: `timeout connecting to ${host}:${port}` }))
    socket.once('connect', () => finish({ ok: true }))
    socket.once('error', error => finish({ ok: false, reason: error.code || error.message }))
  })
}

export async function checkRuntimeDependencies(env) {
  const postgres = endpointFromUrl(env.DATABASE_URL, 5432)
  const redis = endpointFromUrl(env.REDIS_URL, 6379)
  const [postgresResult, redisResult] = await Promise.all([checkTcpEndpoint(postgres), checkTcpEndpoint(redis)])
  const checks = { postgres: postgresResult, redis: redisResult }
  if (!postgresResult.ok || !redisResult.ok) {
    const failed = Object.entries(checks).filter(([, result]) => !result.ok).map(([name, result]) => `${name}: ${result.reason}`)
    throw new Error(`Runtime dependency check failed:\n- ${failed.join('\n- ')}`)
  }
  return checks
}
