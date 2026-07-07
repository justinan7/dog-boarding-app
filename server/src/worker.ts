import { initDb } from './db/client'
import { log } from './lib/log'

// Background worker — timed care/med alerts, HEIC processing, webhook
// reconciliation, digests. Runs pg-boss as a SEPARATE process from the api so a
// due med alert survives an api restart (see docs/architecture §4, task B8).
// Stub for now: initializes the db and idles until B8 adds the pg-boss consumer.
await initDb()
log.info('zoomez-worker started (stub — pg-boss jobs land in task B8)')

let running = true
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    log.info({ sig }, 'worker shutting down')
    running = false
  })
}

// Keep the process alive.
await new Promise<void>((resolve) => {
  const tick = setInterval(() => {
    if (!running) {
      clearInterval(tick)
      resolve()
    }
  }, 1000)
})
process.exit(0)
