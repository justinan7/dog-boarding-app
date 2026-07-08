import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './_shared'
import { roleEnum } from './enums'

// Single-tenant v1, but keyed for future multi-tenant.
export const organizations = pgTable('organizations', {
  id: pk(),
  name: text('name').notNull(),
  timeZone: text('time_zone').notNull().default('America/Los_Angeles'),
  createdAt: createdAt(),
})

// Domain user. Better Auth (task B3) owns the auth columns/tables (session,
// account, verification) and maps its `user` onto this table via its Drizzle
// adapter; `role` + profile fields are ours. Staff and managers are the same
// account type with a different role (manager screens are PIN-gated in the app).
export const users = pgTable('users', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  role: roleEnum('role').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  displayName: text('display_name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})
