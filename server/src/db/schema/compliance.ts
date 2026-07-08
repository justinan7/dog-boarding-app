import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { organizations, users } from './identity'
import { customers } from './crm'
import { reservations } from './booking'
import { waiverStatusEnum, incidentTypeEnum, incidentSeverityEnum, roleEnum } from './enums'

export const waiverTemplates = pgTable('waiver_templates', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  docusealTemplateId: text('docuseal_template_id'),
  createdAt: createdAt(),
})

export const waiverSubmissions = pgTable('waiver_submissions', {
  id: pk(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  templateId: uuid('template_id').notNull().references(() => waiverTemplates.id),
  templateVersion: integer('template_version').notNull(),
  status: waiverStatusEnum('status').notNull().default('missing'),
  docusealSubmissionId: text('docuseal_submission_id'),
  signedPdfObjectKey: text('signed_pdf_object_key'),
  certificate: jsonb('certificate'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('waiver_submissions_customer_idx').on(t.customerId)])

// Append-only. Dogs involved kept as a uuid[] on the immutable record.
export const incidentReports = pgTable('incident_reports', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  reservationId: uuid('reservation_id').references(() => reservations.id),
  type: incidentTypeEnum('type').notNull(),
  severity: incidentSeverityEnum('severity').notNull(),
  petIds: uuid('pet_ids').array(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  description: text('description').notNull(),
  photoObjectKeys: text('photo_object_keys').array(),
  actionsTaken: text('actions_taken').array(),
  ownerNotified: boolean('owner_notified').notNull().default(false),
  reportedByUserId: uuid('reported_by_user_id').notNull().references(() => users.id),
  createdAt: createdAt(),
}, (t) => [index('incidents_reservation_idx').on(t.reservationId)])

// Append-only domain event log. Every state transition writes one in the same
// transaction (api-contract §6.1). occurred_at is timestamptz + a tz label.
export const auditEntries = pgTable('audit_entries', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  tz: text('tz'),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  actorRole: roleEnum('actor_role'),
  action: text('action').notNull(),         // e.g. 'reservation.approve', 'thread.takeover'
  subjectType: text('subject_type').notNull(),
  subjectId: uuid('subject_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  correlationId: text('correlation_id'),
}, (t) => [
  index('audit_subject_idx').on(t.subjectType, t.subjectId),
  index('audit_occurred_idx').on(t.occurredAt),
])
