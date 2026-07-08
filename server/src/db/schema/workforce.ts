import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, integer, timestamp, date, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { organizations, users } from './identity'
import { shiftStatusEnum, claimStateEnum, swapStateEnum } from './enums'

// Open shifts that staff claim Uber-style. Window stored as local wall-clock +
// zone, with computed UTC bounds for querying "who is on shift now".
export const shifts = pgTable('shifts', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  windowDate: date('window_date').notNull(),
  windowStartLocal: text('window_start_local').notNull(), // 'HH:MM'
  windowEndLocal: text('window_end_local').notNull(),
  timeZone: text('time_zone').notNull(),
  windowStartUtc: timestamp('window_start_utc', { withTimezone: true }).notNull(),
  windowEndUtc: timestamp('window_end_utc', { withTimezone: true }).notNull(),
  roleNeeded: text('role_needed').notNull().default('staff'),
  status: shiftStatusEnum('status').notNull().default('open'),
  dogCount: integer('dog_count').notNull().default(0),
  medRoundCount: integer('med_round_count').notNull().default(0),
  notes: text('notes'),
  createdAt: createdAt(),
}, (t) => [index('shifts_window_idx').on(t.windowStartUtc, t.windowEndUtc)])

// First-come claim. The partial unique index enforces invariant 2: at most ONE
// active (pending|approved) claim per shift, so a concurrent second claim fails
// with a unique violation → 409 "just taken". (Truly exercised in B9 against a
// multi-connection Postgres; PGlite is single-connection.)
export const shiftClaims = pgTable('shift_claims', {
  id: pk(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id),
  staffId: uuid('staff_id').notNull().references(() => users.id),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  state: claimStateEnum('state').notNull().default('pending'),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('shift_claims_active_uq')
    .on(t.shiftId)
    .where(sql`${t.state} in ('pending', 'approved')`),
  index('shift_claims_staff_idx').on(t.staffId),
])

export const shiftSwaps = pgTable('shift_swaps', {
  id: pk(),
  fromShiftId: uuid('from_shift_id').notNull().references(() => shifts.id),
  toStaffId: uuid('to_staff_id').notNull().references(() => users.id),
  state: swapStateEnum('state').notNull().default('pending'),
  createdAt: createdAt(),
})

// on_shift_now — the view over approved shifts intersected with now() that
// routes a firing care task to the right staffer — is created in task B9 as a
// dedicated SQL migration (it needs the shift-time logic B9 owns). Tables above
// are complete; the view is intentionally deferred.
