import { createMiddleware } from 'hono/factory'
import { AppError } from '../lib/errors'
import { isElevated } from '../routes/me'
import type { AppEnv } from '../lib/hono-env'
import type { Role } from '../db/schema'

export type { Role }

/** Reject unauthenticated requests. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  await next()
})

/** Reject requests whose domain role is not in the allowed set. */
export function requireRole(...allowed: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const du = c.get('domainUser')
    if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
    if (!allowed.includes(du.role)) throw new AppError('FORBIDDEN', 'Insufficient role')
    await next()
  })
}

/** Reject requests that lack an active manager elevation (the PIN gate).
 *  Elevation is only grantable to staff/managers (see /me/elevate), so this
 *  alone is sufficient to guard the (M🔒) manager surface. */
export const requireElevation = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session')
  if (!session) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (!isElevated(session.id)) {
    throw new AppError('ELEVATION_REQUIRED', 'Manager PIN required')
  }
  await next()
})
