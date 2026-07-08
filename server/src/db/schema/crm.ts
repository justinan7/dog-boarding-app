import { pgTable, uuid, text, integer, boolean, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './_shared'
import { organizations, users } from './identity'
import { careKindEnum, petSexEnum, vaxStatusEnum } from './enums'

export const customers = pgTable('customers', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id), // null until they claim their invite
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  legalHold: boolean('legal_hold').notNull().default(false),
  softDeletedAt: timestamp('soft_deleted_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('customers_org_idx').on(t.orgId)])

export const pets = pgTable('pets', {
  id: pk(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  breed: text('breed'),
  weightLb: integer('weight_lb'),
  birthYear: integer('birth_year'),
  sex: petSexEnum('sex').notNull().default('unknown'),
  vetContact: text('vet_contact'),
  photoObjectKey: text('photo_object_key'),
  behaviorNotes: text('behavior_notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('pets_customer_idx').on(t.customerId)])

// Feeding/medication/task TEMPLATES — copied into care_tasks when a reservation
// is approved. Times are local wall-clock + IANA zone (never bare UTC).
export const careProfileItems = pgTable('care_profile_items', {
  id: pk(),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  kind: careKindEnum('kind').notNull(),
  label: text('label').notNull(),
  dose: text('dose'),
  localTime: text('local_time').notNull(), // 'HH:MM'
  timeZone: text('time_zone').notNull(),
  days: text('days').array(), // e.g. ['mon','wed']; null = every day of the stay
  instructions: text('instructions'),
  createdAt: createdAt(),
}, (t) => [index('care_profile_pet_idx').on(t.petId)])

export const vaccinationRecords = pgTable('vaccination_records', {
  id: pk(),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  type: text('type').notNull(), // rabies | dhpp | bordetella | … (extensible)
  expiresOn: date('expires_on'),
  status: vaxStatusEnum('status').notNull().default('valid'),
  documentObjectKey: text('document_object_key'),
  createdAt: createdAt(),
}, (t) => [index('vax_pet_idx').on(t.petId)])

// Behavioral / safety flags on a pet (aggression, separate_at_feeding,
// escape_risk, allergy:*, …). Flag kept as text for extensibility.
export const petSafetyFlags = pgTable('pet_safety_flags', {
  id: pk(),
  petId: uuid('pet_id').notNull().references(() => pets.id),
  flag: text('flag').notNull(),
  detail: text('detail'),
  createdAt: createdAt(),
}, (t) => [index('safety_pet_idx').on(t.petId)])

// Undirected "these two dogs must not co-board" edge. Store canonically
// (petAId < petBId, enforced in app) so the unique index dedupes both directions.
export const doNotPair = pgTable('do_not_pair', {
  id: pk(),
  petAId: uuid('pet_a_id').notNull().references(() => pets.id),
  petBId: uuid('pet_b_id').notNull().references(() => pets.id),
  reason: text('reason'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('do_not_pair_uq').on(t.petAId, t.petBId)])

// Vaccination + vet docs on the shared object store; daily expiry-scan cron.
export const documents = pgTable('documents', {
  id: pk(),
  customerId: uuid('customer_id').references(() => customers.id),
  petId: uuid('pet_id').references(() => pets.id),
  kind: text('kind').notNull(),
  objectKey: text('object_key').notNull(),
  expiresOn: date('expires_on'),
  createdAt: createdAt(),
})
