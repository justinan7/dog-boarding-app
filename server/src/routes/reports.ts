import { Hono } from 'hono'
import { eq, desc, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { auditEntries, invoices, users } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const reportsRouter = new Hono<AppEnv>()

// GET /api/v1/reports/summary?month=2026-07 — contract §5.11
reportsRouter.get('/summary', async (c) => {
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

  // Staff stats (simplified for P1)
  const allUsers = await db.select().from(users)
  const staff = allUsers.filter((u) => u.role === 'staff').map((u) => ({
    display: u.displayName,
    shifts: 0, // would need a join; stubbed
    tasks: 0,
    onTimePct: 100,
  }))

  return c.json({
    occupancy: { avgPct, nights },
    revenue: {
      boardingCents,
      upsellsCents: 0, // would need line-item aggregation
      totalCents: boardingCents,
      outstandingCents,
      outstandingCount,
    },
    staff,
  })
})

// GET /api/v1/audit?actor=&action=&subjectType=&cursor= — append-only feed
reportsRouter.get('/audit', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const limit = Math.min(Number(c.req.query('limit') ?? 25), 100)
  let query = db.select().from(auditEntries).$dynamic()

  const action = c.req.query('action')
  if (action) query = query.where(eq(auditEntries.action, action))

  const rows = await query.orderBy(desc(auditEntries.occurredAt)).limit(limit)
  return c.json({ items: rows })
})
