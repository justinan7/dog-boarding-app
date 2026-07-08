import { Hono } from 'hono'
import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import {
  threads, messages, attachments, takeoverEvents,
  users, auditEntries,
} from '../db/schema'
import { AppError } from '../lib/errors'
import { requireElevation } from '../middleware/guards'
import type { AppEnv } from '../lib/hono-env'

export const threadsRouter = new Hono<AppEnv>()

async function resolveActor(db: ReturnType<typeof getDb>, email: string) {
  const [actor] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return actor ?? null
}

// GET /api/v1/threads — (C) own; (S) assigned + unassigned; ?filter=
threadsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const filter = c.req.query('filter')

  let query = db.select().from(threads).$dynamic()

  if (filter) {
    query = query.where(sql`${filter} = ANY(${threads.flags})`)
  }

  const rows = await query.orderBy(desc(threads.lastMessageAt)).limit(50)
  return c.json({ items: rows })
})

// GET /api/v1/threads/:id/messages — paginated oldest-cursor.
// If the caller is a non-participant manager, this IS the silent view —
// server audit-logs oversight.viewed automatically (contract §5.4).
threadsRouter.get('/:id/messages', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const threadId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100)
  const cursor = c.req.query('cursor')

  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1)
  if (!thread) throw new AppError('NOT_FOUND', 'Thread not found')

  // Check if this is a management silent view (non-participant reading)
  const actor = await resolveActor(db, user.email)
  if (actor && actor.role === 'manager' && thread.assignedStaffId !== actor.id) {
    // Auto-log the silent view (the design's "logged 2:14 PM")
    await db.insert(takeoverEvents).values({
      threadId,
      managerUserId: actor.id,
      action: 'view',
    })
    await db.insert(auditEntries).values({
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorRole: 'manager',
      action: 'oversight.viewed',
      subjectType: 'thread',
      subjectId: threadId,
    })
  }

  let query = db.select().from(messages).where(eq(messages.threadId, threadId)).$dynamic()
  if (cursor) {
    query = query.where(and(sql`${messages.sentAt} > (SELECT sent_at FROM messages WHERE id = ${cursor})`))
  }
  const rows = await query.orderBy(asc(messages.sentAt)).limit(limit + 1)
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return c.json({
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  })
})

// POST /api/v1/threads/:id/messages — send a message
const sendSchema = z.object({
  body: z.string().optional(),
  attachmentKeys: z.array(z.string()).optional(),
})

threadsRouter.post('/:id/messages', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const threadId = c.req.param('id')
  const input = sendSchema.parse(await c.req.json())

  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1)
  if (!thread) throw new AppError('NOT_FOUND', 'Thread not found')

  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  // If the thread is taken over and the sender is the muted staffer, reject
  const latestTakeover = await db.select().from(takeoverEvents)
    .where(eq(takeoverEvents.threadId, threadId))
    .orderBy(desc(takeoverEvents.occurredAt))
    .limit(1)
  const lastAction = latestTakeover[0]?.action
  if (lastAction === 'takeover' && thread.assignedStaffId === actor.id && actor.role === 'staff') {
    throw new AppError('FORBIDDEN', 'Thread has been taken over by management — you are muted')
  }

  // Customers see senderDisplay = business identity always; staff/manager send
  // as the business name.
  const senderDisplay = actor.role === 'customer' ? actor.displayName : 'Zoomez concierge'

  const [msg] = await db.insert(messages).values({
    threadId,
    senderUserId: actor.id,
    senderRole: actor.role as 'customer' | 'staff' | 'manager',
    senderDisplay,
    body: input.body,
  }).returning()

  // Attach files if provided
  if (input.attachmentKeys?.length) {
    for (const key of input.attachmentKeys) {
      await db.insert(attachments).values({
        messageId: msg!.id,
        kind: 'photo',
        objectKey: key,
      })
    }
  }

  // Update thread metadata
  await db.update(threads).set({
    lastMessageAt: new Date(),
    // If the message is from a customer, mark unanswered; if from staff, clear it
    flags: actor.role === 'customer'
      ? sql`array_append(COALESCE(${threads.flags}, '{}'), 'unanswered')`
      : sql`array_remove(COALESCE(${threads.flags}, '{}'), 'unanswered')`,
  }).where(eq(threads.id, threadId))

  return c.json(msg, 201)
})

// POST /api/v1/threads/:id/read — mark messages as read
const readSchema = z.object({ lastMessageId: z.string().uuid() })

threadsRouter.post('/:id/read', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const { lastMessageId } = readSchema.parse(await c.req.json())

  // Mark all messages up to lastMessageId as read for this user
  await db.update(messages).set({ readAt: new Date() }).where(
    and(
      eq(messages.threadId, c.req.param('id')),
      sql`${messages.sentAt} <= (SELECT sent_at FROM messages WHERE id = ${lastMessageId})`,
      sql`${messages.readAt} IS NULL`,
    ),
  )

  return c.body(null, 204)
})

// --- Oversight routes ---

// GET /api/v1/oversight/threads — every thread + SLA timers
threadsRouter.get('/oversight', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  // Return all threads sorted by flagged/unanswered first
  const rows = await db.select().from(threads)
    .orderBy(desc(sql`CASE WHEN 'unanswered' = ANY(flags) THEN 0 WHEN 'flagged' = ANY(flags) THEN 1 ELSE 2 END`), desc(threads.lastMessageAt))
    .limit(50)
  return c.json({ items: rows })
})

// POST /api/v1/threads/:id/oversight — join/take_over/hand_back
const oversightSchema = z.object({
  action: z.enum(['join', 'take_over', 'hand_back']),
})

// Map contract action names to the DB enum values.
const actionToDbEnum: Record<string, 'view' | 'join' | 'takeover' | 'handback'> = {
  join: 'join',
  take_over: 'takeover',
  hand_back: 'handback',
}

threadsRouter.post('/:id/oversight', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const threadId = c.req.param('id')
  const { action } = oversightSchema.parse(await c.req.json())

  const [thread] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1)
  if (!thread) throw new AppError('NOT_FOUND', 'Thread not found')

  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const dbAction = actionToDbEnum[action] ?? 'join'

  // Log the takeover event
  await db.insert(takeoverEvents).values({
    threadId,
    managerUserId: actor.id,
    action: dbAction,
  })

  // Audit log
  await db.insert(auditEntries).values({
    orgId: actor.orgId,
    actorUserId: actor.id,
    actorRole: actor.role as 'manager',
    action: `thread.${action}`,
    subjectType: 'thread',
    subjectId: threadId,
  })

  // Return the updated thread
  const [updated] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1)
  return c.json(updated)
})
