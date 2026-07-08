import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { v1 } from './routes/v1'
import { renderError } from './lib/errors'
import { sessionMiddleware } from './middleware/session'
import { createAuth } from './auth'
import { env, isProd } from './env'

import type { AppEnv } from './lib/hono-env'

/** Build the Hono app. Call after db is initialized. */
export async function createApp() {
  const auth = await createAuth()
  const app = new Hono<AppEnv>()

  app.use(
    '*',
    cors({
      origin: isProd
        ? [`https://${env.PUBLIC_DOMAIN ?? 'localhost'}`]
        : ['http://localhost:5173', 'http://localhost:3000'],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'set-auth-token'],
      credentials: true,
    }),
  )

  app.use('*', sessionMiddleware(auth))

  app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

  app.route('/api/v1', v1)

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
  )
  app.onError((err, c) => renderError(c, err))

  return app
}
