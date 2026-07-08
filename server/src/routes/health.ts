import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import type { AppEnv } from '../lib/hono-env'

export const health = new Hono<AppEnv>()

health.get('/', async (c) => {
  let dbOk = false
  try {
    await getDb().execute(sql`select 1`)
    dbOk = true
  } catch {
    dbOk = false
  }
  return c.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'down',
      version: '0.1.0',
      time: new Date().toISOString(),
    },
    dbOk ? 200 : 503,
  )
})
