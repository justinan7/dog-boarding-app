import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { getDb } from '../db/client'
import { careTasks, careTaskEvents, users, pets, auditEntries } from '../db/schema'
import { AppError } from '../lib/errors'
import { zonedWallTimeToUtc } from '../lib/time'
import { isElevated } from './me'
import type { AppEnv } from '../lib/hono-env'

// Alias for the assignee join (the on-shift staffer resolved at fire time).
const assignee = alias(users, 'assignee')

export const careTasksRouter = new Hono<AppEnv>()

async function resolveActor(db: ReturnType<typeof getDb>, email: string) {
  const [actor] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return actor ?? null
}

// GET /api/v1/care-tasks?date=&petId=&state= — the day's rail
careTasksRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const date = c.req.query('date')
  const petId = c.req.query('petId')
  const state = c.req.query('state')

  // Join pet name + assignee display so the UI doesn't need extra round-trips
  // (contract §3: CareTask.petName). assignee is nullable (resolved at fire time).
  let query = db
    .select({
      id: careTasks.id, reservationId: careTasks.reservationId, petId: careTasks.petId,
      petName: pets.name, kind: careTasks.kind, label: careTasks.label, dose: careTasks.dose,
      scheduledDate: careTasks.scheduledDate, scheduledLocalTime: careTasks.scheduledLocalTime,
      timeZone: careTasks.timeZone, nextFireUtc: careTasks.nextFireUtc,
      assignedStaffId: careTasks.assignedStaffId, assigneeDisplay: assignee.displayName,
      state: careTasks.state,
    })
    .from(careTasks)
    .innerJoin(pets, eq(careTasks.petId, pets.id))
    .leftJoin(assignee, eq(careTasks.assignedStaffId, assignee.id))
    .$dynamic()
  if (date) query = query.where(eq(careTasks.scheduledDate, date))
  if (petId) query = query.where(eq(careTasks.petId, petId))
  if (state) query = query.where(eq(careTasks.state, state as never))

  const rows = await query.orderBy(careTasks.nextFireUtc).limit(100)
  return c.json({ items: rows })
})

// POST /api/v1/care-tasks — ad-hoc add (S) [P3, but the route shape is needed now]
const addSchema = z.object({
  petId: z.string().uuid(),
  reservationId: z.string().uuid(),
  kind: z.enum(['feeding', 'medication', 'task']),
  label: z.string().min(1),
  dose: z.string().optional(),
  scheduled: z.object({
    localTime: z.string().regex(/^\d{2}:\d{2}$/),
    timeZone: z.string().min(1),
  }),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

careTasksRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const body = addSchema.parse(await c.req.json())
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const fireUtc = zonedWallTimeToUtc(body.scheduledDate, body.scheduled.localTime, body.scheduled.timeZone)

  const [task] = await db.insert(careTasks).values({
    reservationId: body.reservationId,
    petId: body.petId,
    kind: body.kind,
    label: body.label,
    dose: body.dose,
    scheduledDate: body.scheduledDate,
    scheduledLocalTime: body.scheduled.localTime,
    timeZone: body.scheduled.timeZone,
    nextFireUtc: fireUtc,
    state: 'scheduled',
    addedByUserId: actor.id,
    addedByAt: new Date(),
  }).returning()

  return c.json(task, 201)
})

// POST /api/v1/care-tasks/:id/complete — (assigned staff; M🔒 with managerOverride)
const completeSchema = z.object({
  outcome: z.enum(['given', 'refused', 'skipped']),
  note: z.string().optional(),
  photoKey: z.string().optional(),
  at: z.string().optional(),
  managerOverride: z.boolean().optional(),
})

careTasksRouter.post('/:id/complete', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const taskId = c.req.param('id')
  const body = completeSchema.parse(await c.req.json())

  const [task] = await db.select().from(careTasks).where(eq(careTasks.id, taskId)).limit(1)
  if (!task) throw new AppError('NOT_FOUND', 'Task not found')

  // A manager "Mark done" override requires an active elevation (§5.5).
  const session = c.get('session')
  if (body.managerOverride && (!session || !isElevated(session.id))) {
    throw new AppError('ELEVATION_REQUIRED', 'Manager PIN required to override a task')
  }

  // refused/skipped require a note
  if ((body.outcome === 'refused' || body.outcome === 'skipped') && !body.note) {
    throw new AppError('VALIDATION', 'A note is required for refused/skipped outcomes', {
      fields: { note: 'required' },
    })
  }

  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  // Record the completion event (append-only)
  await db.insert(careTaskEvents).values({
    careTaskId: taskId,
    actorUserId: actor.id,
    occurredAt: body.at ? new Date(body.at) : new Date(),
    outcome: body.outcome,
    note: body.note,
    photoObjectKey: body.photoKey,
    managerOverride: body.managerOverride ? 'true' : null,
  })

  // Update the task state
  const newState = body.outcome === 'given' ? 'done' : body.outcome
  const [updated] = await db.update(careTasks).set({
    state: newState as never,
  }).where(eq(careTasks.id, taskId)).returning()

  // If manager override, audit-log it (the design's "Mark done*")
  if (body.managerOverride) {
    await db.insert(auditEntries).values({
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorRole: actor.role as 'manager',
      action: 'care_task.override',
      subjectType: 'care_task',
      subjectId: taskId,
      after: { outcome: body.outcome, override: true },
    })
  }

  return c.json(updated)
})
