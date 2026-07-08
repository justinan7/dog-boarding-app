import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

// The business's nightly capacity. In v1 this is a flat value per org; later
// it could be a per-day config table. Hardcoded for the prototype per the
// design (8 suites).
const CAPACITY = 8

export const capacityRouter = new Hono<AppEnv>()

// GET /api/v1/capacity?from=YYYY-MM-DD&to=YYYY-MM-DD — contract §5.3
// Returns per-night booked count by range-overlapping approved/in-stay/checked-in
// reservations. Live occupancy is DERIVED, never cached (invariant 1).
capacityRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const from = c.req.query('from')
  const to = c.req.query('to')
  if (!from || !to) throw new AppError('VALIDATION', 'from and to query params required')

  const db = getDb()

  // Generate a date series [from, to] and count reservations whose [start, end)
  // range overlaps each night. A night is "booked" if a guest is in-house that
  // night — i.e. the reservation's date range [start_date, end_date) contains
  // that date. Half-open: endDate is checkout day, NOT a boarded night.
  const rows = await db.execute(sql`
    WITH dates AS (
      SELECT d::date AS night
      FROM generate_series(${from}::date, ${to}::date, '1 day') AS d
    ),
    active_reservations AS (
      SELECT start_date, end_date
      FROM reservations
      WHERE status IN ('approved', 'checked_in', 'in_stay')
    )
    SELECT
      dates.night::text AS date,
      COALESCE(COUNT(ar.*)::int, 0) AS booked
    FROM dates
    LEFT JOIN active_reservations ar
      ON dates.night >= ar.start_date AND dates.night < ar.end_date
    GROUP BY dates.night
    ORDER BY dates.night
  `)

  const nights = (rows.rows as Array<{ date: string; booked: number }>).map((r) => ({
    date: r.date,
    booked: Number(r.booked),
    full: Number(r.booked) >= CAPACITY,
  }))

  return c.json({ capacity: CAPACITY, nights })
})

export { CAPACITY }
