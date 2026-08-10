import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { user as authUser } from '../db/schema/better-auth'
import { health } from './health'
import { me } from './me'
import { customersRouter } from './customers'
import { petsRouter } from './pets'
import { capacityRouter } from './capacity'
import { reservationsRouter } from './reservations'
import { threadsRouter } from './threads'
import { careTasksRouter } from './care-tasks'
import { reportCardsRouter } from './report-cards'
import { shiftsRouter } from './shifts'
import { addonsRouter } from './addons'
import { invoicesRouter } from './invoices'
import { incidentsRouter } from './incidents'
import { reportsRouter } from './reports'
import { pushRouter } from './push'
import { uploadsRouter } from './uploads'
import { mediaRouter } from './media'
import { realtimeRouter } from './realtime'
import { waiversRouter, docusealWebhook } from './waivers'
import { adminRouter } from './admin'
import { env } from '../env'
import type { AppEnv } from '../lib/hono-env'

export const v1 = new Hono<AppEnv>()

// Email-first login: tells the login screen whether to show "sign in" or
// "create account" for a given email, so the user never has to know which.
// Low-value info for this app (a small business), and the same email→role
// mapping is already visible via sign-up behavior. Bounded + trimmed.
v1.get('/auth/account-exists', async (c) => {
  const email = (c.req.query('email') ?? '').toLowerCase().trim()
  if (!email || email.length > 200 || !email.includes('@')) return c.json({ exists: false })
  const [row] = await getDb().select({ id: authUser.id }).from(authUser).where(eq(authUser.email, email)).limit(1)
  return c.json({ exists: !!row })
})

// Public client config (no auth — the login screen needs it before sign-in).
// The VAPID public key is public by design (it goes into pushManager.subscribe).
v1.get('/config', (c) => c.json({
  demoMode: env.DEMO_MODE,
  vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null,
}))

v1.route('/health', health)
v1.route('/me', me)
v1.route('/customers', customersRouter)
v1.route('/pets', petsRouter)
v1.route('/capacity', capacityRouter)
v1.route('/reservations', reservationsRouter)
v1.route('/threads', threadsRouter)
v1.route('/care-tasks', careTasksRouter)
v1.route('/report-cards', reportCardsRouter)
v1.route('/shifts', shiftsRouter)
v1.route('/addons', addonsRouter)
v1.route('/invoices', invoicesRouter)
v1.route('/incidents', incidentsRouter)
v1.route('/reports', reportsRouter)
v1.route('/push', pushRouter)
v1.route('/uploads', uploadsRouter)
v1.route('/media', mediaRouter)
v1.route('/realtime', realtimeRouter)
v1.route('/waivers', waiversRouter)
v1.route('/webhooks/docuseal', docusealWebhook)
v1.route('/admin', adminRouter)

v1.get('/', (c) =>
  c.json({
    name: 'zoomez-api',
    version: 'v1',
    docs: 'see docs/api-contract.md',
  }),
)
