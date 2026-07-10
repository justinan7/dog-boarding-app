import { sql, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { fileURLToPath } from 'node:url'
import { initDb, getDb } from './client'
import { runMigrations } from './migrate'
import { env, isProd } from '../env'
import { log } from '../lib/log'
import {
  schema, organizations, users, customers, pets, careProfileItems, vaccinationRecords,
  petSafetyFlags, reservations, reservationDogs, careTasks, careTaskEvents, threads, messages,
  shifts, shiftClaims, addonCatalogItems, invoices, invoiceLineItems, waiverTemplates,
  waiverSubmissions, auditEntries, reportCards,
} from './schema'

const one = <T>(rows: T[]): T => rows[0]!
const TZ = 'America/Los_Angeles' // PDT = UTC-7 in July
const at = (iso: string) => new Date(iso)

/**
 * Load the design's sample world (Wed Jul 3, 2026): the six in-residence dogs,
 * the two pending booking requests, the Diaz↔Tyler thread, the overdue Jag
 * insulin, Tyler's shift + Maria's pending claim, and the audit trail shown on
 * the reports screen. Idempotent: truncates everything first.
 */
export async function seed(): Promise<void> {
  const db = getDb()

  // Wipe (any order — CASCADE handles FKs).
  const tables = Object.values(schema).filter((v) => is(v, PgTable)).map((t) => `"${getTableName(t)}"`)
  await db.execute(sql.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`))

  const org = one(await db.insert(organizations).values({ name: 'Zoomez', timeZone: TZ }).returning())

  // --- Staff / management ---
  const staff = await db.insert(users).values([
    { orgId: org.id, role: 'manager', email: 'corey@zoomez.app', displayName: 'Corey' },
    { orgId: org.id, role: 'manager', email: 'brette@zoomez.app', displayName: 'Brette' },
    { orgId: org.id, role: 'staff', email: 'tyler@zoomez.app', displayName: 'Tyler Torres' },
    { orgId: org.id, role: 'staff', email: 'maria@zoomez.app', displayName: 'Maria Reyes' },
  ]).returning()
  const corey = staff[0]!, brette = staff[1]!, tyler = staff[2]!, maria = staff[3]!

  // --- Customers (+ their login users) ---
  async function customer(name: string, email: string) {
    const u = one(await db.insert(users).values({ orgId: org.id, role: 'customer', email, displayName: name }).returning())
    const c = one(await db.insert(customers).values({ orgId: org.id, userId: u.id, name, email }).returning())
    return c
  }
  const sarah = await customer('Sarah Mitchell', 'sarah@example.com')
  const diaz = await customer('Marcus Diaz', 'diaz@example.com')
  const kim = await customer('Ana Kim', 'kim@example.com')
  const ramos = await customer('Elena Ramos', 'ramos@example.com')
  const ortiz = await customer('Sam Ortiz', 'ortiz@example.com')

  // --- Pets ---
  const petRows = await db.insert(pets).values([
    { customerId: sarah.id, name: 'Rusty', breed: 'Beagle', weightLb: 24, sex: 'male' },
    { customerId: sarah.id, name: 'Jag', breed: 'Golden Retriever', weightLb: 62, sex: 'female', behaviorNotes: 'Arthritis — give meds with food.' },
    { customerId: diaz.id, name: 'Gus', breed: 'Labrador', weightLb: 70, sex: 'male', behaviorNotes: 'Intact male, crate-trained.' },
    { customerId: kim.id, name: 'Luna', breed: 'Poodle', weightLb: 18, sex: 'female' },
    { customerId: ramos.id, name: 'Cooper', breed: 'Lab mix', weightLb: 55, sex: 'male' },
    { customerId: ortiz.id, name: 'Jack', breed: 'Boxer', weightLb: 65, sex: 'male' },
  ]).returning()
  const rusty = petRows[0]!, jag = petRows[1]!, gus = petRows[2]!
  const luna = petRows[3]!, cooper = petRows[4]!, jackPet = petRows[5]!

  // --- Care profiles (the med/feed templates the screens surface) ---
  await db.insert(careProfileItems).values([
    { petId: rusty.id, kind: 'medication', label: 'Rimadyl 75 mg', dose: '75 mg', localTime: '08:00', timeZone: TZ, instructions: 'With breakfast.' },
    { petId: rusty.id, kind: 'feeding', label: 'Breakfast', dose: '1 cup', localTime: '08:00', timeZone: TZ },
    { petId: rusty.id, kind: 'feeding', label: 'Dinner', dose: '1 cup', localTime: '17:30', timeZone: TZ },
    { petId: jag.id, kind: 'medication', label: 'Insulin', dose: '4u', localTime: '08:00', timeZone: TZ },
    { petId: jag.id, kind: 'medication', label: 'Insulin', dose: '4u', localTime: '18:30', timeZone: TZ },
    { petId: jackPet.id, kind: 'medication', label: 'Insulin', dose: '5u', localTime: '18:00', timeZone: TZ },
  ]).returning()

  // --- Vaccinations (Rusty's Bordetella is expired — pet profile screen) ---
  await db.insert(vaccinationRecords).values([
    { petId: rusty.id, type: 'rabies', expiresOn: '2027-03-01', status: 'valid' },
    { petId: rusty.id, type: 'dhpp', expiresOn: '2027-01-15', status: 'valid' },
    { petId: rusty.id, type: 'bordetella', expiresOn: '2026-06-01', status: 'expired' },
    { petId: jag.id, type: 'rabies', expiresOn: '2027-05-01', status: 'valid' },
  ])

  // --- Safety flags ---
  await db.insert(petSafetyFlags).values([
    { petId: jackPet.id, flag: 'separate_at_feeding', detail: 'Guards food.' },
    { petId: jag.id, flag: 'allergy', detail: 'Chicken.' },
  ])

  // --- Reservations ---
  const jagStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: sarah.id, status: 'in_stay',
    startDate: '2026-07-03', endDate: '2026-07-07', timeZone: TZ, depositCents: 4000,
  }).returning())
  const rustyStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: sarah.id, status: 'approved',
    startDate: '2026-07-04', endDate: '2026-07-06', timeZone: TZ, depositCents: 4000,
    dropoffLocalTime: '09:00', pickupLocalTime: '17:00',
  }).returning())
  const cooperStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: ramos.id, status: 'in_stay',
    startDate: '2026-07-05', endDate: '2026-07-05', serviceType: 'daycare', timeZone: TZ,
  }).returning())
  const jackStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: ortiz.id, status: 'in_stay',
    startDate: '2026-07-05', endDate: '2026-07-08', timeZone: TZ,
  }).returning())
  // Two PENDING requests (calendar-approvals screen):
  const gusReq = one(await db.insert(reservations).values({
    orgId: org.id, customerId: diaz.id, status: 'requested',
    startDate: '2026-07-04', endDate: '2026-07-06', timeZone: TZ, depositCents: 5000,
    notes: 'Intact male, crate-trained.',
  }).returning())
  const lunaReq = one(await db.insert(reservations).values({
    orgId: org.id, customerId: kim.id, status: 'requested',
    startDate: '2026-07-09', endDate: '2026-07-12', timeZone: TZ,
  }).returning())

  await db.insert(reservationDogs).values([
    { reservationId: jagStay.id, petId: jag.id },
    { reservationId: rustyStay.id, petId: rusty.id },
    { reservationId: cooperStay.id, petId: cooper.id },
    { reservationId: jackStay.id, petId: jackPet.id },
    { reservationId: gusReq.id, petId: gus.id },
    { reservationId: lunaReq.id, petId: luna.id },
  ])

  // --- Care tasks for today (Wed Jul 3) — done + upcoming + the overdue one ---
  const doneRusty = one(await db.insert(careTasks).values({
    reservationId: jagStay.id, petId: rusty.id, kind: 'medication', label: 'Rimadyl 75 mg',
    scheduledDate: '2026-07-03', scheduledLocalTime: '08:00', timeZone: TZ,
    nextFireUtc: at('2026-07-03T15:00:00Z'), assignedStaffId: tyler!.id, state: 'done',
  }).returning())
  const doneJagAm = one(await db.insert(careTasks).values({
    reservationId: jagStay.id, petId: jag.id, kind: 'medication', label: 'Insulin 4u',
    scheduledDate: '2026-07-03', scheduledLocalTime: '08:00', timeZone: TZ,
    nextFireUtc: at('2026-07-03T15:00:00Z'), assignedStaffId: tyler!.id, state: 'done',
  }).returning())
  // The overdue Jag insulin (due 2:00 PM, +38m on the dashboard):
  await db.insert(careTasks).values([
    { reservationId: jagStay.id, petId: jag.id, kind: 'medication', label: 'Insulin 4u', scheduledDate: '2026-07-03', scheduledLocalTime: '14:00', timeZone: TZ, nextFireUtc: at('2026-07-03T21:00:00Z'), assignedStaffId: tyler!.id, state: 'overdue' },
    { reservationId: rustyStay.id, petId: rusty.id, kind: 'medication', label: 'Rimadyl 75 mg', scheduledDate: '2026-07-03', scheduledLocalTime: '16:00', timeZone: TZ, nextFireUtc: at('2026-07-03T23:00:00Z'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: cooperStay.id, petId: cooper.id, kind: 'feeding', label: 'Dinner 1.5 cup', scheduledDate: '2026-07-03', scheduledLocalTime: '16:00', timeZone: TZ, nextFireUtc: at('2026-07-03T23:00:00Z'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: jagStay.id, petId: jag.id, kind: 'feeding', label: 'Dinner + insulin', scheduledDate: '2026-07-03', scheduledLocalTime: '18:30', timeZone: TZ, nextFireUtc: at('2026-07-04T01:30:00Z'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: gusReq.id, petId: gus.id, kind: 'task', label: 'Walk 15 min', scheduledDate: '2026-07-03', scheduledLocalTime: '20:00', timeZone: TZ, nextFireUtc: at('2026-07-04T03:00:00Z'), state: 'scheduled' },
  ])
  await db.insert(careTaskEvents).values([
    { careTaskId: doneRusty.id, actorUserId: tyler!.id, occurredAt: at('2026-07-03T15:00:00Z'), outcome: 'given', note: 'took w/ peanut butter, ate fine' },
    { careTaskId: doneJagAm.id, actorUserId: tyler!.id, occurredAt: at('2026-07-03T15:00:00Z'), outcome: 'given' },
  ])

  // --- Thread: Sarah ↔ Brette about Rusty's stay (customer messages screen) ---
  const sarahThread = one(await db.insert(threads).values({
    orgId: org.id, customerId: sarah.id, reservationId: rustyStay.id, assignedStaffId: brette!.id,
    lastMessageAt: at('2026-07-03T16:31:00Z'),
  }).returning())
  await db.insert(messages).values([
    { threadId: sarahThread.id, senderUserId: sarah.userId!, senderRole: 'customer', senderDisplay: 'Sarah Mitchell', body: 'Just dropped Rusty off — his blue blanket is in the bag.', sentAt: at('2026-07-03T16:12:00Z'), readAt: at('2026-07-03T16:13:00Z') },
    { threadId: sarahThread.id, senderUserId: brette!.id, senderRole: 'staff', senderDisplay: 'Zoomez concierge', body: 'Blanket’s already in his suite. He’s sniffing every corner — settling in beautifully.', sentAt: at('2026-07-03T16:15:00Z'), readAt: at('2026-07-03T16:16:00Z') },
    { threadId: sarahThread.id, senderUserId: sarah.userId!, senderRole: 'customer', senderDisplay: 'Sarah Mitchell', body: 'Oh he looks so happy. Thank you.', sentAt: at('2026-07-03T16:31:00Z'), readAt: at('2026-07-03T16:32:00Z') },
  ])

  // --- Report card: Rusty's sent postcard (customer report-card screen) ---
  await db.insert(reportCards).values({
    reservationId: rustyStay.id, petId: rusty.id, date: '2026-07-04', status: 'sent',
    mood: 'Playful', appetite: 'Ate everything',
    bestMoment: 'Rusty made a friend today — he and Jag napped in the sunny spot after a morning of zoomies.',
    careLogSummary: 'Breakfast 6:04a · Rimadyl 8:07a · Walk 10a · Dinner 5:31p',
    sentAt: at('2026-07-04T23:12:00Z'),
  })

  // --- Thread: Diaz ↔ Tyler about Gus's request (inbox oversight screen) ---
  const thread = one(await db.insert(threads).values({
    orgId: org.id, customerId: diaz.id, reservationId: gusReq.id, assignedStaffId: tyler!.id,
    flags: ['unanswered'], lastMessageAt: at('2026-07-03T21:12:00Z'), slaDueAt: at('2026-07-03T21:34:00Z'),
  }).returning())
  await db.insert(messages).values([
    { threadId: thread.id, senderUserId: diaz.userId!, senderRole: 'customer', senderDisplay: 'Marcus Diaz', body: 'Any update on Gus today?', sentAt: at('2026-07-03T21:08:00Z'), readAt: at('2026-07-03T21:09:00Z') },
    { threadId: thread.id, senderUserId: tyler!.id, senderRole: 'staff', senderDisplay: 'Zoomez concierge', body: 'Pickup is anytime before 6.', sentAt: at('2026-07-03T21:10:00Z'), readAt: at('2026-07-03T21:10:30Z') },
    { threadId: thread.id, senderUserId: diaz.userId!, senderRole: 'customer', senderDisplay: 'Marcus Diaz', body: 'Is the deposit refundable if we cancel?', sentAt: at('2026-07-03T21:12:00Z') },
  ])

  // --- Shifts: Tyler on shift today; Maria's pending claim on Jul 4 ---
  const jul3Shift = one(await db.insert(shifts).values({
    orgId: org.id, windowDate: '2026-07-03', windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
    windowStartUtc: at('2026-07-03T14:00:00Z'), windowEndUtc: at('2026-07-03T22:00:00Z'),
    status: 'approved', dogCount: 6, medRoundCount: 3,
  }).returning())
  await db.insert(shiftClaims).values({ shiftId: jul3Shift.id, staffId: tyler!.id, state: 'approved' })
  const jul4Shift = one(await db.insert(shifts).values({
    orgId: org.id, windowDate: '2026-07-04', windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
    windowStartUtc: at('2026-07-04T14:00:00Z'), windowEndUtc: at('2026-07-04T22:00:00Z'),
    status: 'claimed', dogCount: 6, medRoundCount: 3,
  }).returning())
  await db.insert(shiftClaims).values({ shiftId: jul4Shift.id, staffId: maria!.id, state: 'pending' })
  // Two OPEN shifts for the claim board (staff shift-board screen):
  await db.insert(shifts).values([
    {
      orgId: org.id, windowDate: '2026-07-06', windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
      windowStartUtc: at('2026-07-06T14:00:00Z'), windowEndUtc: at('2026-07-06T22:00:00Z'),
      status: 'open', dogCount: 6, medRoundCount: 2,
    },
    {
      orgId: org.id, windowDate: '2026-07-07', windowStartLocal: '15:00', windowEndLocal: '21:00', timeZone: TZ,
      windowStartUtc: at('2026-07-07T22:00:00Z'), windowEndUtc: at('2026-07-08T04:00:00Z'),
      status: 'open', dogCount: 6, medRoundCount: 2,
    },
  ])

  // --- Upsell catalog ---
  await db.insert(addonCatalogItems).values([
    { orgId: org.id, label: 'Bath before pick-up', priceCents: 2500, per: 'stay' },
    { orgId: org.id, label: 'Extra playtime', priceCents: 1000, per: 'day' },
    { orgId: org.id, label: 'Nail trim', priceCents: 1500, per: 'stay' },
    { orgId: org.id, label: 'Send-home photo book', priceCents: 2000, per: 'stay' },
  ])

  // --- Invoice for Rusty's stay (payment screen: $135, $40 deposit) ---
  const inv = one(await db.insert(invoices).values({
    reservationId: rustyStay.id, status: 'open', subtotalCents: 13500, depositPaidCents: 4000, balanceCents: 9500,
  }).returning())
  await db.insert(invoiceLineItems).values([
    { invoiceId: inv.id, kind: 'boarding', label: 'Boarding · 2 nights', qty: 2, unitCents: 5500 },
    { invoiceId: inv.id, kind: 'addon', label: 'Bath before pick-up', qty: 1, unitCents: 2500 },
  ])

  // --- Waivers ---
  const waiver = one(await db.insert(waiverTemplates).values({ orgId: org.id, name: 'Boarding agreement', version: 1 }).returning())
  await db.insert(waiverSubmissions).values([
    { customerId: sarah.id, templateId: waiver.id, templateVersion: 1, status: 'signed', signedAt: at('2026-06-28T18:00:00Z') },
    { customerId: diaz.id, templateId: waiver.id, templateVersion: 1, status: 'signed', signedAt: at('2026-07-01T12:00:00Z') },
    { customerId: kim.id, templateId: waiver.id, templateVersion: 1, status: 'missing' },
  ])

  // --- Audit trail (reports screen) ---
  await db.insert(auditEntries).values([
    { orgId: org.id, occurredAt: at('2026-07-03T21:48:00Z'), tz: TZ, actorUserId: corey!.id, actorRole: 'manager', action: 'reservation.approve', subjectType: 'reservation', subjectId: gusReq.id, after: { status: 'approved' } },
    { orgId: org.id, occurredAt: at('2026-07-03T21:41:00Z'), tz: TZ, actorUserId: brette!.id, actorRole: 'manager', action: 'thread.takeover', subjectType: 'thread', subjectId: thread.id },
    { orgId: org.id, occurredAt: at('2026-07-03T21:38:00Z'), tz: TZ, actorUserId: corey!.id, actorRole: 'manager', action: 'care_task.override', subjectType: 'care_task', subjectId: doneJagAm.id, after: { outcome: 'given', override: true } },
  ])

  log.info('seed complete')
}

// Direct-run: tsx src/db/seed.ts  (dev only; guarded off in prod)
const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  // Demo-world phase: prod MAY seed while DEMO_MODE is on (it wipes
  // everything). Once the business runs on real data, DEMO_MODE=false makes
  // this refuse again.
  if (isProd && !env.DEMO_MODE) throw new Error('refusing to seed in production (DEMO_MODE=false)')
  await initDb()
  await runMigrations()
  await seed()
  process.exit(0)
}
