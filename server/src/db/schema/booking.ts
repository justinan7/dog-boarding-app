import { pgTable, uuid, text, integer, boolean, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './_shared'
import { organizations, users } from './identity'
import { customers, pets } from './crm'
import { reservationStatusEnum, serviceTypeEnum, waitlistStatusEnum } from './enums'

// Date-range reservations, half-open [startDate, endDate). endDate is the
// checkout day, not a boarded night. Live occupancy is DERIVED from overlapping
// in-stay reservations (invariant 1), never a cached counter.
export const reservations = pgTable('reservations', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  serviceType: serviceTypeEnum('service_type').notNull().default('boarding'),
  status: reservationStatusEnum('status').notNull().default('requested'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  // Drop-off / pick-up windows: local wall-clock + zone.
  dropoffLocalTime: text('dropoff_local_time'),
  pickupLocalTime: text('pickup_local_time'),
  timeZone: text('time_zone').notNull(),
  depositCents: integer('deposit_cents').notNull().default(0),
  notes: text('notes'),
  // actual vs scheduled arrival/departure (check-in/out flow)
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('reservations_dates_idx').on(t.startDate, t.endDate),
  index('reservations_status_idx').on(t.status),
])

export const reservationDogs = pgTable('reservation_dogs', {
  id: pk(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  petId: uuid('pet_id').notNull().references(() => pets.id),
}, (t) => [uniqueIndex('reservation_dogs_uq').on(t.reservationId, t.petId)])

// Owner-supplied food/med/blanket; the check-out return checklist.
export const belongings = pgTable('belongings', {
  id: pk(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  petId: uuid('pet_id').references(() => pets.id),
  label: text('label').notNull(),
  qty: integer('qty').notNull().default(1),
  returned: boolean('returned').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index('belongings_reservation_idx').on(t.reservationId)])

// FCFS by createdAt; a time-boxed single-use claim hold swept by pg-boss.
export const waitlistEntries = pgTable('waitlist_entries', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: waitlistStatusEnum('status').notNull().default('waiting'),
  claimHoldExpiresAt: timestamp('claim_hold_expires_at', { withTimezone: true }),
  offeredToUserId: uuid('offered_to_user_id').references(() => users.id),
  createdAt: createdAt(),
}, (t) => [index('waitlist_status_idx').on(t.status)])
