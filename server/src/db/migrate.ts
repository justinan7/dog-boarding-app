import { join } from 'node:path'
import { getHandle } from './client'
import { log } from '../lib/log'

// Resolved from the working directory, which is the package root for every way
// migrations run: `npm test`, `npm run dev`, `npm run db:migrate`, and the prod
// `node dist/migrate.js` deploy step (all invoked from server/). No __dirname
// math — that breaks once tsup collapses src/db/ into dist/.
const migrationsFolder = join(process.cwd(), 'migrations')

/** Apply all pending migrations to the current db, using the right migrator. */
export async function runMigrations(): Promise<void> {
  const { db, kind } = getHandle()
  if (kind === 'pglite') {
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    await migrate(db as never, { migrationsFolder })
  } else {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator')
    await migrate(db as never, { migrationsFolder })
  }
  log.info({ driver: kind }, 'migrations applied')
}
