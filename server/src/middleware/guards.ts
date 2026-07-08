import { createMiddleware } from 'hono/factory'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users, type Role } from '../db/schema'
import { AppError } from '../lib/errors'
import { isElevated } from '../routes/me'
import type { AppEnv } from '../lib/hono-env'

// Re-export role type for route files.
export type { Role }

/** Reject unauthenticated requests. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  await next()
})

/** Reject requests from users whose domain role is below the minimum. */
export function requireRole(...allowed: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
    const db = getDb()
    const [domainUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
    if (!domainUser || !allowed.includes(domainUser.role as Role)) {
      throw new AppError('FORBIDDEN', 'Insufficient role')
    }
    await next()
  })
}

/** Reject requests that lack an active manager elevation (the PIN gate). */
export const requireElevation = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session')
  if (!session) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (!isElevated(session.id)) {
    throw new AppError('ELEVATION_REQUIRED', 'Manager PIN required')
  }
  await next()
})
