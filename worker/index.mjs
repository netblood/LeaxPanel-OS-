const required = ['REDIS_URL']
const missing = required.filter(key => !String(process.env[key] || '').trim())
if (missing.length > 0) {
  console.error(`LeaxPanel worker cannot start. Missing: ${missing.join(', ')}`)
  process.exit(1)
}

console.log('LeaxPanel worker started. Queue backend:', process.env.REDIS_URL.replace(/:\/\/.*@/u, '://***@'))
const heartbeat = setInterval(() => {}, 30_000)
const shutdown = () => { clearInterval(heartbeat); process.exit(0) }
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
