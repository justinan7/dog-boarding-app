import { uuid, timestamp } from 'drizzle-orm/pg-core'

// Column helpers used across tables (conventions from data-model.md).
export const pk = () => uuid('id').primaryKey().defaultRandom()
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
