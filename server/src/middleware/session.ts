import { createMiddleware } from 'hono/factory'
import type { Auth } from '../auth'
import type { AppEnv } from '../lib/hono-env'

/** Resolve the session from cookie or bearer token (Better Auth handles both).
 *  Sets user + session on the Hono context; null if not authenticated. */
export function sessionMiddleware(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!result) {
      c.set('user', null)
      c.set('session', null)
    } else {
      c.set('user', result.user as AppEnv['Variables']['user'])
      c.set('session', result.session as AppEnv['Variables']['session'])
    }
    await next()
  })
}
