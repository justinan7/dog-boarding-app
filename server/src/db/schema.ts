import { pgEnum, pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// PARTIAL schema — a real vertical slice to prove the migration + query pipeline
// end to end. Task B2 completes this to the full model in ../../docs/data-model.md
// (reservations, care_tasks, threads, shifts, invoices, audit, …). Conventions
// used here are the ones B2 should follow: uuid PKs (defaultRandom), timestamptz
// created_at, integer money-cents, snake_case columns.
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum('role', ['customer', 'staff', 'manager'])
export const petSexEnum = pgEnum('pet_sex', ['male', 'female', 'unknown'])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  role: roleEnum('role').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  legalHold: boolean('legal_hold').default(false).notNull(),
  softDeletedAt: timestamp('soft_deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const pets = pgTable('pets', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  breed: text('breed'),
  weightLb: integer('weight_lb'),
  sex: petSexEnum('sex').default('unknown').notNull(),
  photoUrl: text('photo_url'),
  behaviorNotes: text('behavior_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const schema = { organizations, users, customers, pets }
