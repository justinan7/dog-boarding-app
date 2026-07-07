import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'

export const health = new Hono()

// GET /api/v1/health — liveness + db connectivity. 200 when the db answers,
// 503 when it doesn't (so uptime checks can distinguish "up" from "degraded").
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
