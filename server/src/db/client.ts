import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { schema } from './schema'
import { env } from '../env'
import { log } from '../lib/log'

export type DbKind = 'pg' | 'pglite'
// Both drivers expose the same query API; we type the app against the
// node-postgres shape and construct the PGlite one behind a cast (runtime
// identical). Downstream code stays driver-agnostic.
export type Db = NodePgDatabase<typeof schema>

interface Handle {
  db: Db
  kind: DbKind
  close: () => Promise<void>
}

let handle: Handle | null = null

/** Construct a db handle from a URL, choosing the driver by scheme. */
export async function createDb(url: string): Promise<Handle> {
  if (url.startsWith('pglite')) {
    // pglite://memory | pglite://<path>  (dev/test only; devDependency)
    const rest = url.slice('pglite://'.length)
    const dataDir = rest === '' || rest === 'memory' ? undefined : rest
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const client = new PGlite(dataDir)
    const db = drizzle(client, { schema }) as unknown as Db
    return { db, kind: 'pglite', close: () => client.close() }
  }
  // Real Postgres (dev against a server, and prod).
  const { Pool } = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  return { db, kind: 'pg', close: () => pool.end() }
}

/** Initialize the process-wide db singleton. Call once at startup / in tests. */
export async function initDb(url: string = env.DATABASE_URL): Promise<Handle> {
  if (handle) return handle
  handle = await createDb(url)
  log.info({ driver: handle.kind }, 'database initialized')
  return handle
}

export function getHandle(): Handle {
  if (!handle) throw new Error('db not initialized — call initDb() first')
  return handle
}

/** The db instance for query building. */
export function getDb(): Db {
  return getHandle().db
}

/** For tests: drop the singleton so a fresh one can be created. */
export async function resetDb(): Promise<void> {
  if (handle) await handle.close()
  handle = null
}
