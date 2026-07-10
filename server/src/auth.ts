import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer, magicLink } from 'better-auth/plugins'
import { getHandle } from './db/client'
import * as betterAuthSchema from './db/schema/better-auth'
import { env, isProd } from './env'
import { log } from './lib/log'

// Better Auth owns user/session/account/verification tables. Our domain tables
// are managed by Drizzle. Both coexist in one Postgres (ADR-002/009).

export async function createAuth() {
  const handle = getHandle()

  // The drizzle adapter needs a drizzle instance whose fullSchema includes
  // Better Auth's tables (user, session, account, verification). We build
  // this from the raw client + the BA schema, separate from our domain drizzle.
  let database: Parameters<typeof betterAuth>[0]['database']
  if (handle.kind === 'pglite') {
    const { drizzle } = await import('drizzle-orm/pglite')
    const baDb = drizzle(handle.rawClient as never, { schema: betterAuthSchema })
    database = drizzleAdapter(baDb, { provider: 'pg', schema: betterAuthSchema })
  } else {
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const baDb = drizzle(handle.rawClient as never, { schema: betterAuthSchema })
    database = drizzleAdapter(baDb, { provider: 'pg', schema: betterAuthSchema })
  }

  return betterAuth({
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    // Public HTTPS origin — TLS terminates upstream (RackNerd Caddy), so the
    // request reaching Node looks http; baseURL keeps cookies/URLs correct.
    ...(isProd && env.PUBLIC_DOMAIN ? { baseURL: `https://${env.PUBLIC_DOMAIN}` } : {}),
    database,

    emailAndPassword: { enabled: true },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },

    plugins: [
      bearer({ requireSignature: true }),
      magicLink({
        expiresIn: 300,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url: linkUrl }) => {
          log.info({ email, url: linkUrl }, 'magic link generated (email sender not yet wired)')
        },
      }),
    ],

    // In prod only the public domain is trusted. In dev, trust the request's
    // own origin: the PWA is opened from a phone via the Mac's LAN IP
    // (http://192.168.x.x:5173) and Vite proxies /api same-origin, so the
    // Origin header varies by device — a fixed localhost list would block
    // phone sign-in with a CSRF origin-check failure. Dev only, never prod.
    trustedOrigins: isProd
      ? [`https://${env.PUBLIC_DOMAIN ?? 'localhost'}`]
      : (request?: Request) => {
          const origin = request?.headers.get('origin')
          return origin ? [origin] : ['http://localhost:5173']
        },
  })
}

export type Auth = Awaited<ReturnType<typeof createAuth>>
