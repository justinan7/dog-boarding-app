import { pgTable, uuid, text, date, timestamp, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { users } from './identity'
import { pets } from './crm'
import { reservations } from './booking'
import { careKindEnum, careTaskStateEnum, careOutcomeEnum } from './enums'

// One row per timed instance (materialized from care_profile_items on approval,
// or added ad-hoc by staff). Scheduled time is local wall-clock + IANA zone;
// next_fire_utc is computed on write and recomputed on edit (invariant 4).
export const careTasks = pgTable('care_tasks', {
  id: pk(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  kind: careKindEnum('kind').notNull(),
  label: text('label').notNull(),
  dose: text('dose'),
  scheduledDate: date('scheduled_date').notNull(),
  scheduledLocalTime: text('scheduled_local_time').notNull(), // 'HH:MM'
  timeZone: text('time_zone').notNull(),
  nextFireUtc: timestamp('next_fire_utc', { withTimezone: true }).notNull(),
  // Resolved at fire time from on_shift_now — not who was on shift at creation.
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id),
  state: careTaskStateEnum('state').notNull().default('scheduled'),
  // Ad-hoc provenance ("added by Jack, 11:42 AM"); null for materialized tasks.
  addedByUserId: uuid('added_by_user_id').references(() => users.id),
  addedByAt: timestamp('added_by_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  index('care_tasks_reservation_idx').on(t.reservationId),
  index('care_tasks_fire_idx').on(t.nextFireUtc),
  index('care_tasks_state_idx').on(t.state),
])

// Append-only completion log. Editing a logged time inserts a NEW row that cites
// the prior via supersedesEventId; the original is preserved (data-model §17).
export const careTaskEvents = pgTable('care_task_events', {
  id: pk(),
  careTaskId: uuid('care_task_id').notNull().references(() => careTasks.id),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  outcome: careOutcomeEnum('outcome').notNull(),
  note: text('note'),
  photoObjectKey: text('photo_object_key'),
  managerOverride: text('manager_override'), // null, or the reason a manager marked it (flagged in audit)
  supersedesEventId: uuid('supersedes_event_id'),
  createdAt: createdAt(),
}, (t) => [index('care_events_task_idx').on(t.careTaskId)])
