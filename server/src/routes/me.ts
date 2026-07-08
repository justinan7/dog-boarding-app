import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { users, customers } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

// Manager PIN elevation state — stored in-memory keyed by session id. On a
// single VPS this is correct; for multi-node, move to session metadata.
const elevations = new Map<string, { expiresAt: number }>()
const pinAttempts = new Map<string, { count: number; windowStart: number }>()

const ELEVATION_DURATION_MS = 15 * 60 * 1000
const MAX_PIN_ATTEMPTS = 5
const PIN_WINDOW_MS = 15 * 60 * 1000
const MANAGER_PIN = '1234'

export function isElevated(sessionId: string): Date | null {
  const e = elevations.get(sessionId)
  if (!e) return null
  if (Date.now() > e.expiresAt) {
    elevations.delete(sessionId)
    return null
  }
  return new Date(e.expiresAt)
}

export const me = new Hono<AppEnv>()

// GET /api/v1/me — contract §2.4
me.get('/', async (c) => {
  const user = c.get('user')
  const session = c.get('session')
  if (!user || !session) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const [domainUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)

  let customerId: string | null = null
  let staffId: string | null = null
  const role = domainUser?.role ?? 'customer'

  if (role === 'customer' && domainUser) {
    const [cust] = await db.select().from(customers).where(eq(customers.userId, domainUser.id)).limit(1)
    customerId = cust?.id ?? null
  }
  if (role === 'staff' || role === 'manager') {
    staffId = domainUser?.id ?? null
  }

  const elevated = isElevated(session.id)

  return c.json({
    id: user.id,
    role,
    name: user.name,
    email: user.email,
    customerId,
    staffId,
    managerElevatedUntil: elevated?.toISOString() ?? null,
  })
})

// POST /api/v1/me/elevate — contract §2.3
const elevateSchema = z.object({ pin: z.string() })
me.post('/elevate', async (c) => {
  const session = c.get('session')
  const user = c.get('user')
  if (!user || !session) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const now = Date.now()
  let attempts = pinAttempts.get(session.id)
  if (attempts && now - attempts.windowStart > PIN_WINDOW_MS) {
    attempts = undefined
    pinAttempts.delete(session.id)
  }
  if (attempts && attempts.count >= MAX_PIN_ATTEMPTS) {
    throw new AppError('RATE_LIMITED', 'Too many PIN attempts. Try again later.')
  }

  const body = elevateSchema.parse(await c.req.json())

  if (body.pin !== MANAGER_PIN) {
    const a = attempts ?? { count: 0, windowStart: now }
    a.count++
    pinAttempts.set(session.id, a)
    throw new AppError('FORBIDDEN', 'Incorrect PIN')
  }

  pinAttempts.delete(session.id)
  elevations.set(session.id, { expiresAt: now + ELEVATION_DURATION_MS })
  return c.body(null, 204)
})

// POST /api/v1/me/de-elevate
me.post('/de-elevate', async (c) => {
  const session = c.get('session')
  if (!session) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  elevations.delete(session.id)
  return c.body(null, 204)
})
