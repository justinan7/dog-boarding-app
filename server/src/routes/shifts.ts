import { Hono } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { shifts, shiftClaims, users, auditEntries } from '../db/schema'
import { AppError } from '../lib/errors'
import { requireElevation, requireRole } from '../middleware/guards'
import { zonedWallTimeToUtc } from '../lib/time'
import type { AppEnv } from '../lib/hono-env'

export const shiftsRouter = new Hono<AppEnv>()

async function resolveActor(db: ReturnType<typeof getDb>, email: string) {
  const [actor] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return actor ?? null
}

// GET /api/v1/shifts?status=open&from=&to= — open board
shiftsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const status = c.req.query('status')
  let query = db.select().from(shifts).$dynamic()
  if (status) query = query.where(eq(shifts.status, status as never))
  const rows = await query.orderBy(shifts.windowStartUtc).limit(50)

  // Enrich with the active (pending/approved) claim so the board can show
  // "Pending · you" / "assigned Brette" without extra round-trips.
  const items = await Promise.all(rows.map(async (s) => {
    const [claim] = await db
      .select({ staffId: shiftClaims.staffId, staffDisplay: users.displayName, state: shiftClaims.state })
      .from(shiftClaims)
      .innerJoin(users, eq(shiftClaims.staffId, users.id))
      .where(and(
        eq(shiftClaims.shiftId, s.id),
        inArray(shiftClaims.state, ['pending', 'approved']),
      ))
      .limit(1)
    return { ...s, activeClaim: claim ?? null }
  }))

  return c.json({ items })
})

// GET /api/v1/shifts/mine — my assigned/claimed shifts
shiftsRouter.get('/mine', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const rows = await db.select({
    shift: shifts,
    claim: shiftClaims,
  }).from(shiftClaims)
    .innerJoin(shifts, eq(shiftClaims.shiftId, shifts.id))
    .where(eq(shiftClaims.staffId, actor.id))
    .orderBy(shifts.windowStartUtc)
    .limit(50)

  return c.json({ items: rows })
})

// POST /api/v1/shifts — (M🔒) post an open shift
const createSchema = z.object({
  windowDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowStartLocal: z.string().regex(/^\d{2}:\d{2}$/),
  windowEndLocal: z.string().regex(/^\d{2}:\d{2}$/),
  timeZone: z.string().default('America/Los_Angeles'),
  notes: z.string().optional(),
})

shiftsRouter.post('/', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const body = createSchema.parse(await c.req.json())
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const startUtc = zonedWallTimeToUtc(body.windowDate, body.windowStartLocal, body.timeZone)
  const endUtc = zonedWallTimeToUtc(body.windowDate, body.windowEndLocal, body.timeZone)

  const [shift] = await db.insert(shifts).values({
    orgId: actor.orgId,
    ...body,
    windowStartUtc: startUtc,
    windowEndUtc: endUtc,
    status: 'open',
  }).returning()

  return c.json(shift, 201)
})

// POST /api/v1/shifts/:id/claim — first-come claim (invariant 2)
// The partial unique index on shift_claims (state IN pending/approved) ensures
// exactly one active claim per shift. A concurrent second claim violates the
// unique constraint → catch → 409.
shiftsRouter.post('/:id/claim', requireRole('staff', 'manager'), async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const shiftId = c.req.param('id')
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1)
  if (!shift) throw new AppError('NOT_FOUND', 'Shift not found')

  // Check for overlap with the claimer's existing approved shifts
  const existing = await db.select().from(shiftClaims)
    .innerJoin(shifts, eq(shiftClaims.shiftId, shifts.id))
    .where(and(
      eq(shiftClaims.staffId, actor.id),
      eq(shiftClaims.state, 'approved'),
    ))
  const overlap = existing.find((e) =>
    e.shifts.windowStartUtc < shift.windowEndUtc &&
    e.shifts.windowEndUtc > shift.windowStartUtc,
  )
  if (overlap) {
    throw new AppError('CONFLICT', 'Overlaps with your existing shift', {
      overlap: { shiftId: overlap.shifts.id, date: overlap.shifts.windowDate },
    })
  }

  try {
    const [claim] = await db.insert(shiftClaims).values({
      shiftId,
      staffId: actor.id,
      state: 'pending',
    }).returning()

    // Update shift status
    await db.update(shifts).set({ status: 'claimed' }).where(eq(shifts.id, shiftId))

    return c.json({ claim }, 200)
  } catch (err: unknown) {
    // Unique constraint violation = someone claimed first
    if (err instanceof Error && err.message.includes('unique')) {
      throw new AppError('CONFLICT', 'This shift was just claimed by someone else')
    }
    throw err
  }
})

// DELETE /api/v1/shifts/:id/claim — withdraw (own, while pending)
shiftsRouter.delete('/:id/claim', requireRole('staff', 'manager'), async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const shiftId = c.req.param('id')
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const [claim] = await db.update(shiftClaims)
    .set({ state: 'withdrawn' })
    .where(and(
      eq(shiftClaims.shiftId, shiftId),
      eq(shiftClaims.staffId, actor.id),
      eq(shiftClaims.state, 'pending'),
    ))
    .returning()
  if (!claim) throw new AppError('NOT_FOUND', 'No pending claim found')

  // Reopen the shift
  await db.update(shifts).set({ status: 'open' }).where(eq(shifts.id, shiftId))
  return c.json(claim)
})

// POST /api/v1/shifts/:id/claim/approve — (M🔒)
shiftsRouter.post('/:id/claim/approve', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const shiftId = c.req.param('id')
  const actor = await resolveActor(db, user.email)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const [claim] = await db.update(shiftClaims)
    .set({ state: 'approved' })
    .where(and(eq(shiftClaims.shiftId, shiftId), eq(shiftClaims.state, 'pending')))
    .returning()
  if (!claim) throw new AppError('NOT_FOUND', 'No pending claim to approve')

  await db.update(shifts).set({ status: 'approved' }).where(eq(shifts.id, shiftId))

  await db.insert(auditEntries).values({
    orgId: actor.orgId,
    actorUserId: actor.id,
    actorRole: actor.role as 'manager',
    action: 'shift_claim.approve',
    subjectType: 'shift',
    subjectId: shiftId,
    after: { staffId: claim.staffId },
  })

  return c.json(claim)
})

// POST /api/v1/shifts/:id/claim/deny — (M🔒)
shiftsRouter.post('/:id/claim/deny', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const shiftId = c.req.param('id')

  const [claim] = await db.update(shiftClaims)
    .set({ state: 'denied' })
    .where(and(eq(shiftClaims.shiftId, shiftId), eq(shiftClaims.state, 'pending')))
    .returning()
  if (!claim) throw new AppError('NOT_FOUND', 'No pending claim to deny')

  await db.update(shifts).set({ status: 'open' }).where(eq(shifts.id, shiftId))
  return c.json(claim)
})
