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

    trustedOrigins: isProd
      ? [`https://${env.PUBLIC_DOMAIN ?? 'localhost'}`]
      : ['http://localhost:5173', 'http://localhost:3000'],
  })
}

export type Auth = Awaited<ReturnType<typeof createAuth>>
