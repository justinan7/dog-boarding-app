import { join } from 'node:path'
import { getHandle } from './client'
import { log } from '../lib/log'

// Resolved from the working directory (the package root for npm test/dev/
// db:migrate), overridable via MIGRATIONS_DIR for the Nix-packaged prod
// deploy, where the unit's cwd isn't the package. No __dirname math — that
// breaks once tsup collapses src/db/ into dist/.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? join(process.cwd(), 'migrations')

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
