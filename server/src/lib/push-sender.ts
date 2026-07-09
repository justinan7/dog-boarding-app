import { eq, and, inArray } from 'drizzle-orm'
import { getDb } from '../db/client'
import { pushSubscriptions, users } from '../db/schema'
import { env } from '../env'
import { log } from './log'

// Web-push delivery. VAPID keys come from secrets; when unset (dev default)
// every send is a silent no-op so the rest of the app never has to care.

export interface PushPayload {
  title: string
  body: string
  /** In-app path to open on tap. */
  url?: string
  /** Collapses repeat notifications of the same kind. */
  tag?: string
}

const configured = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)

let webpushPromise: Promise<typeof import('web-push')> | null = null
async function getWebpush() {
  webpushPromise ??= import('web-push').then((m) => {
    const wp = (m as { default?: typeof import('web-push') }).default ?? m
    wp.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)
    return wp
  })
  return webpushPromise
}

/** Send a push to every webpush subscription of the given domain users. */
export async function pushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configured || userIds.length === 0) return
  const db = getDb()
  const subs = await db.select().from(pushSubscriptions).where(and(
    inArray(pushSubscriptions.userId, userIds),
    eq(pushSubscriptions.platform, 'webpush'),
  ))
  if (subs.length === 0) return

  const wp = await getWebpush()
  const body = JSON.stringify(payload)

  await Promise.all(subs.map(async (sub) => {
    try {
      await wp.sendNotification(JSON.parse(sub.token), body)
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // Subscription expired/revoked — prune it.
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
        log.debug({ subId: sub.id }, 'pruned dead push subscription')
      } else {
        log.warn({ err: (err as Error).message, subId: sub.id }, 'push send failed')
      }
    }
  }))
}

/** Push to every staff + manager (fallback when no assignee is on shift). */
export async function pushToStaff(payload: PushPayload): Promise<void> {
  if (!configured) return
  const db = getDb()
  const staff = await db.select({ id: users.id }).from(users)
    .where(inArray(users.role, ['staff', 'manager']))
  await pushToUsers(staff.map((s) => s.id), payload)
}

/** Push to every manager (incident escalations). */
export async function pushToManagers(payload: PushPayload): Promise<void> {
  if (!configured) return
  const db = getDb()
  const managers = await db.select({ id: users.id }).from(users)
    .where(eq(users.role, 'manager'))
  await pushToUsers(managers.map((m) => m.id), payload)
}
