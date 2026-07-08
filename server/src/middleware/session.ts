import { createMiddleware } from 'hono/factory'
import type { Auth } from '../auth'
import type { AppEnv } from '../lib/hono-env'
import { resolveOrProvisionDomainUser } from '../lib/domain-user'

/** Resolve the session from cookie or bearer token (Better Auth handles both),
 *  then resolve/provision the domain user. Sets user, session, and domainUser
 *  on the Hono context; all null if not authenticated. */
export function sessionMiddleware(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!result) {
      c.set('user', null)
      c.set('session', null)
      c.set('domainUser', null)
      await next()
      return
    }
    c.set('user', result.user as AppEnv['Variables']['user'])
    c.set('session', result.session as AppEnv['Variables']['session'])
    // Provision-on-first-sign-in: guarantees an authed user has a domain row
    // (and, for customers, a customers record) so the app actually works.
    const domainUser = await resolveOrProvisionDomainUser({
      email: result.user.email,
      name: result.user.name,
    })
    c.set('domainUser', domainUser)
    await next()
  })
}
