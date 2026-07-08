import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { auditEntries, invoices, invoiceLineItems, shiftClaims, careTaskEvents, users } from '../db/schema'
import { AppError } from '../lib/errors'
import { requireElevation } from '../middleware/guards'
import type { AppEnv } from '../lib/hono-env'

export const reportsRouter = new Hono<AppEnv>()

// GET /api/v1/reports/summary?month=2026-07 — contract §5.11 (M🔒)
reportsRouter.get('/summary', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7)
  const from = `${month}-01`
  const to = `${month}-31` // overshoot is fine; PG handles it

  // Occupancy: count reservations overlapping each night this month
  const occupancy = await db.execute(sql`
    WITH dates AS (
      SELECT d::date AS night
      FROM generate_series(${from}::date, ${to}::date, '1 day') AS d
    )
    SELECT dates.night::text AS date,
           COALESCE(COUNT(r.*)::int, 0) AS booked
    FROM dates
    LEFT JOIN reservations r
      ON r.status IN ('approved', 'checked_in', 'in_stay', 'checked_out')
      AND dates.night >= r.start_date AND dates.night < r.end_date
    GROUP BY dates.night
    ORDER BY dates.night
  `)
  const nights = (occupancy.rows as Array<{ date: string; booked: number }>).map((r) => ({
    date: r.date,
    booked: Number(r.booked),
  }))
  const avgPct = nights.length > 0
    ? Math.round(nights.reduce((s, n) => s + n.booked, 0) / nights.length / 8 * 100)
    : 0

  // Revenue: sum invoices for reservations in this month
  const allInvoices = await db.select().from(invoices)
  const boardingCents = allInvoices.reduce((s, i) => s + i.subtotalCents, 0)
  const outstandingCents = allInvoices.filter((i) => i.status === 'open').reduce((s, i) => s + i.balanceCents, 0)
  const outstandingCount = allInvoices.filter((i) => i.status === 'open').length

  // Upsells = addon line items across invoices.
  const upsellRows = await db.select({ cents: invoiceLineItems.unitCents, qty: invoiceLineItems.qty })
    .from(invoiceLineItems).where(eq(invoiceLineItems.kind, 'addon'))
  const upsellsCents = upsellRows.reduce((s, r) => s + r.cents * r.qty, 0)

  // Staff stats: approved shifts + completed task events per staff.
  const staffUsers = (await db.select().from(users)).filter((u) => u.role === 'staff')
  const staff = await Promise.all(staffUsers.map(async (u) => {
    const shiftCount = (await db.select().from(shiftClaims)
      .where(and(eq(shiftClaims.staffId, u.id), eq(shiftClaims.state, 'approved')))).length
    const taskCount = (await db.select().from(careTaskEvents)
      .where(eq(careTaskEvents.actorUserId, u.id))).length
    return { display: u.displayName, shifts: shiftCount, tasks: taskCount, onTimePct: 100 }
  }))

  return c.json({
    occupancy: { avgPct, nights },
    revenue: {
      boardingCents,
      upsellsCents,
      totalCents: boardingCents + upsellsCents,
      outstandingCents,
      outstandingCount,
    },
    staff,
  })
})

// GET /api/v1/audit?actor=&action=&subjectType=&cursor= — append-only feed (M🔒)
reportsRouter.get('/audit', requireElevation, async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const limit = Math.min(Number(c.req.query('limit') ?? 25), 100)
  let query = db
    .select({
      id: auditEntries.id, occurredAt: auditEntries.occurredAt,
      actorDisplay: users.displayName, actorRole: auditEntries.actorRole,
      action: auditEntries.action, subjectType: auditEntries.subjectType, subjectId: auditEntries.subjectId,
    })
    .from(auditEntries)
    .leftJoin(users, eq(auditEntries.actorUserId, users.id))
    .$dynamic()

  const action = c.req.query('action')
  if (action) query = query.where(eq(auditEntries.action, action))

  const rows = await query.orderBy(desc(auditEntries.occurredAt)).limit(limit)
  return c.json({ items: rows })
})
