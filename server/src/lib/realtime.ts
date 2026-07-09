import { createHmac } from 'node:crypto'
import { env } from '../env'
import { log } from './log'

// Centrifugo integration (ADR: realtime is a stateless sidecar; durable truth
// stays in Postgres and clients reconcile over REST on reconnect).
//
// Model: SERVER-SIDE subscriptions — the connection JWT carries the channels
// this user belongs to, Centrifugo subscribes them itself, and the client just
// listens. No client-side subscribe surface → no channel-permission config.
//
// Channels:
//   staff            — staff+manager broadcast (task board, inbox, approvals)
//   user:<userId>    — personal (their threads, their reservations, cards)
// Payloads are HINTS ({kind, ...ids}) — clients refetch via REST; no content
// rides the socket.

const configured = !!env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY

export function realtimeEnabled(): boolean {
  return configured
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Mint a Centrifugo connection JWT (HS256) with server-side subscriptions. */
export function connectionToken(userId: string, channels: string[], ttlSeconds = 12 * 3600): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    channels,
  }))
  const sig = b64url(createHmac('sha256', env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY!)
    .update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${sig}`
}

export interface RealtimeEvent {
  kind: 'message' | 'care-task' | 'reservation' | 'report-card' | 'shift'
  threadId?: string
  reservationId?: string
  petId?: string
}

/** Publish an event hint to a channel. Fire-and-forget; never throws. */
export async function publish(channel: string, data: RealtimeEvent): Promise<void> {
  if (!configured || !env.CENTRIFUGO_HTTP_API_KEY) return
  try {
    const res = await fetch(`${env.CENTRIFUGO_HTTP_API_URL}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.CENTRIFUGO_HTTP_API_KEY,
      },
      body: JSON.stringify({ channel, data }),
    })
    if (!res.ok) log.warn({ channel, status: res.status }, 'centrifugo publish failed')
  } catch (err) {
    log.warn({ channel, err: (err as Error).message }, 'centrifugo unreachable')
  }
}

export const publishStaff = (data: RealtimeEvent) => publish('staff', data)
export const publishUser = (userId: string, data: RealtimeEvent) => publish(`user.${userId}`, data)
