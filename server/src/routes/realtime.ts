import { Hono } from 'hono'
import { AppError } from '../lib/errors'
import { realtimeEnabled, connectionToken } from '../lib/realtime'
import type { AppEnv } from '../lib/hono-env'

export const realtimeRouter = new Hono<AppEnv>()

// GET /api/v1/realtime/token — Centrifugo connection JWT with this user's
// server-side subscriptions. {enabled:false} when the sidecar isn't configured
// (dev default) — the client silently skips realtime and stays REST-only.
realtimeRouter.get('/token', async (c) => {
  const user = c.get('user')
  const du = c.get('domainUser')
  if (!user || !du) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  if (!realtimeEnabled()) return c.json({ enabled: false, token: null, url: null })

  const channels = [`user.${du.id}`]
  if (du.role === 'staff' || du.role === 'manager') channels.push('staff')

  return c.json({
    enabled: true,
    token: connectionToken(du.id, channels),
    // Same-origin path — Caddy routes /connection/* to Centrifugo.
    url: '/connection/websocket',
  })
})
