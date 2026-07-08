import { initDb } from './db/client'
import { runMigrations } from './db/migrate'
import { initBoss, stopBoss } from './jobs/boss'
import { registerCareAlertHandler, catchUpSweep } from './jobs/care-alert'
import { isProd } from './env'
import { log } from './lib/log'

await initDb()
if (!isProd) await runMigrations()

const boss = await initBoss()

if (boss) {
  registerCareAlertHandler(boss)
  await catchUpSweep(boss)
  log.info('zoomez-worker started with pg-boss')
} else {
  log.info('zoomez-worker started in stub mode (PGlite — no pg-boss)')
}

let running = true
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    log.info({ sig }, 'worker shutting down')
    running = false
    await stopBoss()
  })
}

await new Promise<void>((resolve) => {
  const tick = setInterval(() => {
    if (!running) { clearInterval(tick); resolve() }
  }, 1000)
})
process.exit(0)
