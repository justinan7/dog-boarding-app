import { serve } from '@hono/node-server'
import { app } from './app'
import { initDb } from './db/client'
import { runMigrations } from './db/migrate'
import { env, isProd } from './env'
import { log } from './lib/log'

await initDb()
// In dev/test the in-process PGlite starts empty, so auto-apply migrations.
// In prod, migrations are a deliberate deploy step (`npm run db:migrate`) — not
// run on every boot.
if (!isProd) await runMigrations()

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info(`zoomez-api listening on http://localhost:${info.port}`)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    log.info({ sig }, 'shutting down')
    server.close()
    process.exit(0)
  })
}
