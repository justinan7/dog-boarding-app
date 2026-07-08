import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { reservations } from './booking'
import { pets } from './crm'

export const reportCards = pgTable('report_cards', {
  id: pk(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  date: date('date').notNull(),
  status: text('status').notNull().default('draft'), // 'draft' | 'sent'
  mood: text('mood'),
  appetite: text('appetite'),
  photoObjectKeys: text('photo_object_keys').array(),
  bestMoment: text('best_moment'),
  careLogSummary: text('care_log_summary'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  heartedAt: timestamp('hearted_at', { withTimezone: true }),
  createdAt: createdAt(),
})
