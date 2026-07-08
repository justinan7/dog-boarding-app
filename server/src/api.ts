import { serve } from '@hono/node-server'
import { createApp } from './app'
import { initDb } from './db/client'
import { runMigrations } from './db/migrate'
import { env, isProd } from './env'
import { log } from './lib/log'

const handle = await initDb()
if (!isProd) await runMigrations()

const app = await createApp()

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info({ port: info.port, driver: handle.kind }, 'zoomez-api listening')
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    log.info({ sig }, 'shutting down')
    server.close()
    process.exit(0)
  })
}
