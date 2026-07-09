import { Hono } from 'hono'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import {
  reservations, reservationDogs, users, customers, pets,
  careProfileItems, careTasks, belongings, auditEntries,
} from '../db/schema'
import { AppError } from '../lib/errors'
import { CAPACITY } from './capacity'
import { requireElevation } from '../middleware/guards'
import { zonedWallTimeToUtc } from '../lib/time'
import { ownCustomerId } from '../lib/domain-user'
import { publishStaff } from '../lib/realtime'
import type { AppEnv } from '../lib/hono-env'

export const reservationsRouter = new Hono<AppEnv>()

// Helper: compute per-night booked counts for a date range to check capacity.
async function nightCounts(db: ReturnType<typeof getDb>, startDate: string, endDate: string) {
  const rows = await db.execute(sql`
    WITH dates AS (
      SELECT d::date AS night
      FROM generate_series(${startDate}::date, (${endDate}::date - 1), '1 day') AS d
    )
    SELECT dates.night::text AS date,
           COALESCE(COUNT(r.*)::int, 0) AS booked
    FROM dates
    LEFT JOIN reservations r
      ON r.status IN ('approved', 'checked_in', 'in_stay')
      AND dates.night >= r.start_date AND dates.night < r.end_date
    GROUP BY dates.night
    ORDER BY dates.night
  `)
  return (rows.rows as Array<{ date: string; booked: number }>).map((r) => ({
    date: r.date,
    booked: Number(r.booked),
    full: Number(r.booked) >= CAPACITY,
  }))
}

// POST /api/v1/reservations — customer requests a stay (status: requested)
const createSchema = z.object({
  petIds: z.array(z.string().uuid()).min(1),
  serviceType: z.enum(['boarding', 'daycare', 'grooming']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dropoffLocalTime: z.string().optional(),
  pickupLocalTime: z.string().optional(),
  timeZone: z.string().default('America/Los_Angeles'),
  notes: z.string().optional(),
})

reservationsRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = createSchema.parse(await c.req.json())
  const db = getDb()

  // Resolve the customer for this user
  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')
  const [cust] = await db.select().from(customers).where(eq(customers.userId, actor.id)).limit(1)
  if (!cust) throw new AppError('FORBIDDEN', 'Customer record not found')

  // Check capacity — warn but don't block (the request is for MANAGEMENT to decide)
  const nights = await nightCounts(db, body.startDate, body.endDate)
  const fullNights = nights.filter((n) => n.full)
  const warnings = fullNights.map((n) => `CAPACITY_FULL: ${n.date}`)

  const [reservation] = await db.insert(reservations).values({
    orgId: actor.orgId,
    customerId: cust.id,
    serviceType: body.serviceType ?? 'boarding',
    status: 'requested',
    startDate: body.startDate,
    endDate: body.endDate,
    dropoffLocalTime: body.dropoffLocalTime,
    pickupLocalTime: body.pickupLocalTime,
    timeZone: body.timeZone,
    notes: body.notes,
  }).returning()

  // Link pets
  if (body.petIds.length > 0) {
    await db.insert(reservationDogs).values(
      body.petIds.map((petId) => ({ reservationId: reservation!.id, petId })),
    )
  }

  void publishStaff({ kind: 'reservation', reservationId: reservation!.id })
  return c.json({ ...reservation, warnings }, 201)
})

// GET /api/v1/reservations — (C) own; (S) all with filters.
reservationsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const status = c.req.query('status')
  const limit = Math.min(Number(c.req.query('limit') ?? 25), 100)

  let query = db
    .select({
      id: reservations.id, customerId: reservations.customerId, customerName: customers.name,
      serviceType: reservations.serviceType, status: reservations.status,
      startDate: reservations.startDate, endDate: reservations.endDate,
      dropoffLocalTime: reservations.dropoffLocalTime, pickupLocalTime: reservations.pickupLocalTime,
      depositCents: reservations.depositCents, notes: reservations.notes,
      timeZone: reservations.timeZone, createdAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .$dynamic()

  // Customers only ever see their own reservations (contract: "(C) own").
  const du = c.get('domainUser')
  const filters = []
  if (du?.role === 'customer') {
    const custId = await ownCustomerId(du)
    if (!custId) return c.json({ items: [] })
    filters.push(eq(reservations.customerId, custId))
  }
  if (status) filters.push(eq(reservations.status, status as never))
  if (filters.length > 0) query = query.where(and(...filters))

  const base = await query.orderBy(reservations.createdAt).limit(limit)

  // Attach the pets for each reservation (from reservation_dogs → pets).
  const items = await Promise.all(base.map(async (r) => {
    const dogs = await db
      .select({ id: pets.id, name: pets.name, breed: pets.breed })
      .from(reservationDogs)
      .innerJoin(pets, eq(reservationDogs.petId, pets.id))
      .where(eq(reservationDogs.reservationId, r.id))
    return { ...r, petNames: dogs.map((d) => d.name), pets: dogs }
  }))

  return c.json({ items })
})

// GET /api/v1/reservations/:id
reservationsRouter.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const [res] = await db.select().from(reservations).where(eq(reservations.id, c.req.param('id'))).limit(1)
  if (!res) throw new AppError('NOT_FOUND', 'Reservation not found')
  return c.json(res)
})

// POST /api/v1/reservations/:id/approve — (M🔒) per contract §5.3
const approveSchema = z.object({
  overrideCapacity: z.boolean().optional(),
  overrideWaiver: z.boolean().optional(),
})

reservationsRouter.post('/:id/approve', requireElevation, async (c) => {
  const user = c.get('user')
  const session = c.get('session')
  if (!user || !session) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const resId = c.req.param('id')
  const body = approveSchema.parse(await c.req.json())

  const [res] = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1)
  if (!res) throw new AppError('NOT_FOUND', 'Reservation not found')
  if (res.status !== 'requested') throw new AppError('CONFLICT', 'Reservation is not in requested status')

  // Check capacity — if any night is FULL and overrideCapacity is not true, reject
  const nights = await nightCounts(db, res.startDate, res.endDate)
  const fullNights = nights.filter((n) => n.full)
  if (fullNights.length > 0 && !body.overrideCapacity) {
    throw new AppError('CAPACITY_FULL', 'One or more nights are at capacity', {
      dates: fullNights.map((n) => n.date),
    })
  }

  // Approve the reservation
  const [approved] = await db
    .update(reservations)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(reservations.id, resId))
    .returning()

  // Materialize care tasks from each pet's care profile (contract: approval
  // creates the timed to-do rail for the stay)
  const dogs = await db.select().from(reservationDogs).where(eq(reservationDogs.reservationId, resId))
  for (const dog of dogs) {
    const profile = await db.select().from(careProfileItems).where(eq(careProfileItems.petId, dog.petId))
    for (const item of profile) {
      // Create one task per day in the stay for each profile item
      const start = new Date(res.startDate)
      const end = new Date(res.endDate)
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        const fireUtc = zonedWallTimeToUtc(dateStr, item.localTime, item.timeZone)

        await db.insert(careTasks).values({
          reservationId: resId,
          petId: dog.petId,
          kind: item.kind as 'feeding' | 'medication' | 'task',
          label: item.label,
          dose: item.dose,
          scheduledDate: dateStr,
          scheduledLocalTime: item.localTime,
          timeZone: item.timeZone,
          nextFireUtc: fireUtc,
          state: 'scheduled',
        })
      }
    }
  }

  // Audit log
  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (actor) {
    await db.insert(auditEntries).values({
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorRole: actor.role as 'manager',
      action: 'reservation.approve',
      subjectType: 'reservation',
      subjectId: resId,
      after: { status: 'approved', overrideCapacity: body.overrideCapacity ?? false },
    })
  }

  return c.json(approved)
})

// POST /api/v1/reservations/:id/deny
reservationsRouter.post('/:id/deny', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const resId = c.req.param('id')
  const body = z.object({ reason: z.string().optional() }).parse(await c.req.json())

  const [updated] = await db
    .update(reservations)
    .set({ status: 'denied', updatedAt: new Date() })
    .where(and(eq(reservations.id, resId), eq(reservations.status, 'requested')))
    .returning()
  if (!updated) throw new AppError('NOT_FOUND', 'Reservation not found or not in requested status')

  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (actor) {
    await db.insert(auditEntries).values({
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorRole: actor.role as 'manager',
      action: 'reservation.deny',
      subjectType: 'reservation',
      subjectId: resId,
      after: { status: 'denied', reason: body.reason },
    })
  }

  return c.json(updated)
})

// POST /api/v1/reservations/:id/waitlist
reservationsRouter.post('/:id/waitlist', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [updated] = await db
    .update(reservations)
    .set({ status: 'waitlisted', updatedAt: new Date() })
    .where(and(eq(reservations.id, c.req.param('id')), eq(reservations.status, 'requested')))
    .returning()
  if (!updated) throw new AppError('NOT_FOUND', 'Reservation not found or not in requested status')
  return c.json(updated)
})

// POST /api/v1/reservations/:id/check-in
const checkInSchema = z.object({
  arrivedAt: z.string().optional(),
  belongings: z.array(z.object({ label: z.string(), qty: z.number().int().positive() })).optional(),
})

reservationsRouter.post('/:id/check-in', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = checkInSchema.parse(await c.req.json())
  const db = getDb()
  const resId = c.req.param('id')

  const [updated] = await db
    .update(reservations)
    .set({
      status: 'checked_in',
      checkedInAt: body.arrivedAt ? new Date(body.arrivedAt) : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(reservations.id, resId), eq(reservations.status, 'approved')))
    .returning()
  if (!updated) throw new AppError('CONFLICT', 'Reservation must be in approved status to check in')

  if (body.belongings?.length) {
    const dogs = await db.select().from(reservationDogs).where(eq(reservationDogs.reservationId, resId))
    for (const b of body.belongings) {
      await db.insert(belongings).values({
        reservationId: resId,
        petId: dogs[0]?.petId,
        label: b.label,
        qty: b.qty,
      })
    }
  }

  return c.json(updated)
})

// POST /api/v1/reservations/:id/check-out
reservationsRouter.post('/:id/check-out', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [updated] = await db
    .update(reservations)
    .set({
      status: 'checked_out',
      checkedOutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(reservations.id, c.req.param('id')),
      inArray(reservations.status, ['checked_in', 'in_stay']),
    ))
    .returning()
  if (!updated) throw new AppError('CONFLICT', 'Reservation must be checked in to check out')
  return c.json(updated)
})

// POST /api/v1/reservations/:id/cancel — pre-approval: withdrawn
reservationsRouter.post('/:id/cancel', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [res] = await db.select().from(reservations).where(eq(reservations.id, c.req.param('id'))).limit(1)
  if (!res) throw new AppError('NOT_FOUND', 'Reservation not found')
  if (!['requested', 'approved', 'waitlisted'].includes(res.status)) {
    throw new AppError('CONFLICT', 'Cannot cancel a reservation in this status')
  }

  const [updated] = await db
    .update(reservations)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(reservations.id, res.id))
    .returning()
  return c.json(updated)
})
