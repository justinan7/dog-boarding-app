import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { schema } from './schema'
import { env } from '../env'
import { log } from '../lib/log'

export type DbKind = 'pg' | 'pglite'
export type Db = NodePgDatabase<typeof schema>

export interface Handle {
  db: Db
  kind: DbKind
  rawClient: unknown
  close: () => Promise<void>
}

let handle: Handle | null = null

export async function createDb(url: string): Promise<Handle> {
  if (url.startsWith('pglite')) {
    const rest = url.slice('pglite://'.length)
    const dataDir = rest === '' || rest === 'memory' ? undefined : rest
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const client = new PGlite(dataDir)
    const db = drizzle(client, { schema }) as unknown as Db
    return { db, kind: 'pglite', rawClient: client, close: () => client.close() }
  }
  const { Pool } = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  return { db, kind: 'pg', rawClient: pool, close: () => pool.end() }
}

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

export function getDb(): Db {
  return getHandle().db
}

export async function resetDb(): Promise<void> {
  if (handle) await handle.close()
  handle = null
}
