import { assertValidEnv, getRuntimeEnv } from './env.mjs'

try {
  assertValidEnv(getRuntimeEnv())
  console.log('Environment validation passed.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
