import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { organizations, users } from './identity'
import { customers } from './crm'
import { reservations } from './booking'
import { roleEnum, attachmentKindEnum, attachmentVariantEnum, takeoverActionEnum } from './enums'

// One owned thread per customer (usually scoped to the active stay). Threads in
// OUR Postgres — management oversight is a plain SQL read, not cross-service.
export const threads = pgTable('threads', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  reservationId: uuid('reservation_id').references(() => reservations.id),
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id),
  flags: text('flags').array(), // 'flagged' | 'unanswered' | 'med' | 'billing'
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  slaDueAt: timestamp('sla_due_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('threads_customer_idx').on(t.customerId)])

export const messages = pgTable('messages', {
  id: pk(),
  threadId: uuid('thread_id').notNull().references(() => threads.id),
  senderUserId: uuid('sender_user_id').notNull().references(() => users.id),
  senderRole: roleEnum('sender_role').notNull(),
  // Customers always see the business/team identity, never the individual staffer.
  senderDisplay: text('sender_display').notNull(),
  body: text('body'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
}, (t) => [index('messages_thread_idx').on(t.threadId, t.sentAt)])

export const attachments = pgTable('attachments', {
  id: pk(),
  messageId: uuid('message_id').notNull().references(() => messages.id),
  kind: attachmentKindEnum('kind').notNull(),
  variant: attachmentVariantEnum('variant').notNull().default('orig'),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type'),
  width: integer('width'),
  height: integer('height'),
}, (t) => [index('attachments_message_idx').on(t.messageId)])

// Append-only oversight trail. A non-participant manager opening a thread logs a
// silent 'view'; join/takeover/handback are the visible transitions.
export const takeoverEvents = pgTable('takeover_events', {
  id: pk(),
  threadId: uuid('thread_id').notNull().references(() => threads.id),
  managerUserId: uuid('manager_user_id').notNull().references(() => users.id),
  action: takeoverActionEnum('action').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('takeover_thread_idx').on(t.threadId)])
