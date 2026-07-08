import { Hono } from 'hono'
import { getDb } from '../db/client'
import { addonCatalogItems } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const addonsRouter = new Hono<AppEnv>()

// GET /api/v1/addons — upsell catalog (any authed)
addonsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const rows = await db.select().from(addonCatalogItems)
  return c.json({ items: rows })
})
