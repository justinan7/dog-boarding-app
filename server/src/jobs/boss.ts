import PgBoss from 'pg-boss'
import { env } from '../env'
import { log } from '../lib/log'

let boss: PgBoss | null = null

/** Initialize pg-boss. For PGlite dev, pg-boss can't connect (it needs a real
 *  PG connection string), so we return a null boss and the worker stubs. */
export async function initBoss(): Promise<PgBoss | null> {
  if (!env.DATABASE_URL.startsWith('postgresql')) {
    log.warn('pg-boss requires real Postgres — skipping in PGlite dev mode')
    return null
  }
  boss = new PgBoss(env.DATABASE_URL)
  await boss.start()
  log.info('pg-boss started')
  return boss
}

export function getBoss(): PgBoss | null {
  return boss
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop()
    boss = null
  }
}
