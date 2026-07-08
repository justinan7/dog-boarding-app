import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { pushSubscriptions, users } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const pushRouter = new Hono<AppEnv>()

// POST /api/v1/push/subscriptions — register a push subscription
const subSchema = z.object({
  platform: z.enum(['webpush', 'apns', 'fcm']),
  token: z.string().min(1),
  deviceName: z.string().optional(),
})

pushRouter.post('/subscriptions', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const body = subSchema.parse(await c.req.json())

  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const [sub] = await db.insert(pushSubscriptions).values({
    userId: actor.id,
    platform: body.platform,
    token: body.token,
    deviceName: body.deviceName,
  }).returning()

  return c.json(sub, 201)
})

// DELETE /api/v1/push/subscriptions/:id
pushRouter.delete('/subscriptions/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [deleted] = await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.id, c.req.param('id')))
    .returning()
  if (!deleted) throw new AppError('NOT_FOUND', 'Subscription not found')
  return c.json(deleted)
})
