import { sql, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { fileURLToPath } from 'node:url'
import { initDb, getDb } from './client'
import { runMigrations } from './migrate'
import { zonedWallTimeToUtc } from '../lib/time'
import { env, isProd } from '../env'
import { log } from '../lib/log'
import * as betterAuthSchema from './schema/better-auth'
import {
  schema, organizations, users, customers, pets, careProfileItems, vaccinationRecords,
  petSafetyFlags, reservations, reservationDogs, careTasks, careTaskEvents, threads, messages,
  shifts, shiftClaims, addonCatalogItems, invoices, invoiceLineItems, waiverTemplates,
  waiverSubmissions, auditEntries, reportCards,
} from './schema'

const one = <T>(rows: T[]): T => rows[0]!
const TZ = 'America/Los_Angeles' // the business timezone

// The demo world is anchored to TODAY (in the business zone) — every seed run
// re-anchors it, so the dashboard always reads like a live operation.
const D0 = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
/** D0 + offset days, as YYYY-MM-DD. */
export function day(offset: number): string {
  const [y, m, d] = D0.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + offset)).toISOString().slice(0, 10)
}
/** Wall-clock HH:MM on D0+offset in the business zone, as a UTC Date. */
const wall = (offset: number, hhmm: string) => zonedWallTimeToUtc(day(offset), hhmm, TZ)
export const DEMO_TODAY = day(0)

/**
 * Load the design's sample world, anchored to TODAY: the in-residence dogs,
 * the two pending booking requests, the Diaz↔Tyler thread, the overdue Jag
 * insulin, Tyler's shift + Maria's pending claim, and the audit trail shown on
 * the reports screen. Idempotent: truncates everything first.
 */
export async function seed(): Promise<void> {
  const db = getDb()

  // Wipe DOMAIN tables only (CASCADE handles FKs). Better Auth's tables are
  // deliberately excluded: reseeding must never delete anyone's login — the
  // session middleware re-links auth accounts to the fresh domain rows by email.
  const authTables = new Set<string>(
    Object.values(betterAuthSchema).filter((v) => is(v, PgTable)).map((t) => getTableName(t)),
  )
  const tables = Object.values(schema)
    .filter((v) => is(v, PgTable))
    .map((t) => getTableName(t))
    .filter((n) => !authTables.has(n))
    .map((n) => `"${n}"`)
  await db.execute(sql.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`))

  const org = one(await db.insert(organizations).values({ name: 'Zoomez', timeZone: TZ }).returning())

  // --- Staff / management ---
  const staff = await db.insert(users).values([
    // Real people first — their sign-ups (by email) get manager rights.
    { orgId: org.id, role: 'admin', email: 'justin@4nunns.com', displayName: 'Justin' },
    { orgId: org.id, role: 'manager', email: 'corey@zoomez.app', displayName: 'Corey' },
    { orgId: org.id, role: 'manager', email: 'brette@zoomez.app', displayName: 'Brette' },
    { orgId: org.id, role: 'staff', email: 'tyler@zoomez.app', displayName: 'Tyler Torres' },
    { orgId: org.id, role: 'staff', email: 'maria@zoomez.app', displayName: 'Maria Reyes' },
  ]).returning()
  const corey = staff[1]!, brette = staff[2]!, tyler = staff[3]!, maria = staff[4]!

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
    { petId: rusty.id, type: 'rabies', expiresOn: day(300), status: 'valid' },
    { petId: rusty.id, type: 'dhpp', expiresOn: day(200), status: 'valid' },
    { petId: rusty.id, type: 'bordetella', expiresOn: day(-40), status: 'expired' },
    { petId: jag.id, type: 'rabies', expiresOn: day(400), status: 'valid' },
  ])

  // --- Safety flags ---
  await db.insert(petSafetyFlags).values([
    { petId: jackPet.id, flag: 'separate_at_feeding', detail: 'Guards food.' },
    { petId: jag.id, flag: 'allergy', detail: 'Chicken.' },
  ])

  // --- Reservations ---
  const jagStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: sarah.id, status: 'in_stay',
    startDate: day(-1), endDate: day(3), timeZone: TZ, depositCents: 4000,
  }).returning())
  const rustyStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: sarah.id, status: 'approved',
    startDate: day(1), endDate: day(3), timeZone: TZ, depositCents: 4000,
    dropoffLocalTime: '09:00', pickupLocalTime: '17:00',
  }).returning())
  const cooperStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: ramos.id, status: 'in_stay',
    startDate: day(0), endDate: day(0), serviceType: 'daycare', timeZone: TZ,
  }).returning())
  const jackStay = one(await db.insert(reservations).values({
    orgId: org.id, customerId: ortiz.id, status: 'in_stay',
    startDate: day(0), endDate: day(3), timeZone: TZ,
  }).returning())
  // Two PENDING requests (calendar-approvals screen):
  const gusReq = one(await db.insert(reservations).values({
    orgId: org.id, customerId: diaz.id, status: 'requested',
    startDate: day(1), endDate: day(3), timeZone: TZ, depositCents: 5000,
    notes: 'Intact male, crate-trained.',
  }).returning())
  const lunaReq = one(await db.insert(reservations).values({
    orgId: org.id, customerId: kim.id, status: 'requested',
    startDate: day(6), endDate: day(9), timeZone: TZ,
  }).returning())

  await db.insert(reservationDogs).values([
    { reservationId: jagStay.id, petId: jag.id },
    { reservationId: rustyStay.id, petId: rusty.id },
    { reservationId: cooperStay.id, petId: cooper.id },
    { reservationId: jackStay.id, petId: jackPet.id },
    { reservationId: gusReq.id, petId: gus.id },
    { reservationId: lunaReq.id, petId: luna.id },
  ])

  // --- Care tasks for today — done + upcoming + the overdue one ---
  const doneRusty = one(await db.insert(careTasks).values({
    reservationId: jagStay.id, petId: rusty.id, kind: 'medication', label: 'Rimadyl 75 mg',
    scheduledDate: day(0), scheduledLocalTime: '08:00', timeZone: TZ,
    nextFireUtc: wall(0, '08:00'), assignedStaffId: tyler!.id, state: 'done',
  }).returning())
  const doneJagAm = one(await db.insert(careTasks).values({
    reservationId: jagStay.id, petId: jag.id, kind: 'medication', label: 'Insulin 4u',
    scheduledDate: day(0), scheduledLocalTime: '08:00', timeZone: TZ,
    nextFireUtc: wall(0, '08:00'), assignedStaffId: tyler!.id, state: 'done',
  }).returning())
  // The overdue Jag insulin (due 2:00 PM, +38m on the dashboard):
  await db.insert(careTasks).values([
    { reservationId: jagStay.id, petId: jag.id, kind: 'medication', label: 'Insulin 4u', scheduledDate: day(0), scheduledLocalTime: '14:00', timeZone: TZ, nextFireUtc: wall(0, '14:00'), assignedStaffId: tyler!.id, state: 'overdue' },
    { reservationId: rustyStay.id, petId: rusty.id, kind: 'medication', label: 'Rimadyl 75 mg', scheduledDate: day(0), scheduledLocalTime: '16:00', timeZone: TZ, nextFireUtc: wall(0, '16:00'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: cooperStay.id, petId: cooper.id, kind: 'feeding', label: 'Dinner 1.5 cup', scheduledDate: day(0), scheduledLocalTime: '16:00', timeZone: TZ, nextFireUtc: wall(0, '16:00'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: jagStay.id, petId: jag.id, kind: 'feeding', label: 'Dinner + insulin', scheduledDate: day(0), scheduledLocalTime: '18:30', timeZone: TZ, nextFireUtc: wall(0, '18:30'), assignedStaffId: tyler!.id, state: 'scheduled' },
    { reservationId: gusReq.id, petId: gus.id, kind: 'task', label: 'Walk 15 min', scheduledDate: day(0), scheduledLocalTime: '20:00', timeZone: TZ, nextFireUtc: wall(0, '20:00'), state: 'scheduled' },
  ])
  await db.insert(careTaskEvents).values([
    { careTaskId: doneRusty.id, actorUserId: tyler!.id, occurredAt: wall(0, '08:04'), outcome: 'given', note: 'took w/ peanut butter, ate fine' },
    { careTaskId: doneJagAm.id, actorUserId: tyler!.id, occurredAt: wall(0, '08:07'), outcome: 'given' },
  ])

  // --- Thread: Sarah ↔ Brette about Rusty's stay (customer messages screen) ---
  const sarahThread = one(await db.insert(threads).values({
    orgId: org.id, customerId: sarah.id, reservationId: rustyStay.id, assignedStaffId: brette!.id,
    lastMessageAt: wall(0, '09:31'),
  }).returning())
  await db.insert(messages).values([
    { threadId: sarahThread.id, senderUserId: sarah.userId!, senderRole: 'customer', senderDisplay: 'Sarah Mitchell', body: 'Just dropped Rusty off — his blue blanket is in the bag.', sentAt: wall(0, '09:12'), readAt: wall(0, '09:13') },
    { threadId: sarahThread.id, senderUserId: brette!.id, senderRole: 'staff', senderDisplay: 'Zoomez concierge', body: 'Blanket’s already in his suite. He’s sniffing every corner — settling in beautifully.', sentAt: wall(0, '09:15'), readAt: wall(0, '09:16') },
    { threadId: sarahThread.id, senderUserId: sarah.userId!, senderRole: 'customer', senderDisplay: 'Sarah Mitchell', body: 'Oh he looks so happy. Thank you.', sentAt: wall(0, '09:31'), readAt: wall(0, '09:32') },
  ])

  // --- Report card: Rusty's sent postcard (customer report-card screen) ---
  await db.insert(reportCards).values({
    reservationId: rustyStay.id, petId: rusty.id, date: day(0), status: 'sent',
    mood: 'Playful', appetite: 'Ate everything',
    bestMoment: 'Rusty made a friend today — he and Jag napped in the sunny spot after a morning of zoomies.',
    careLogSummary: 'Breakfast 6:04a · Rimadyl 8:07a · Walk 10a · Dinner 5:31p',
    sentAt: wall(0, '16:12'),
  })

  // --- Thread: Diaz ↔ Tyler about Gus's request (inbox oversight screen) ---
  const thread = one(await db.insert(threads).values({
    orgId: org.id, customerId: diaz.id, reservationId: gusReq.id, assignedStaffId: tyler!.id,
    flags: ['unanswered'], lastMessageAt: wall(0, '14:12'), slaDueAt: wall(0, '14:34'),
  }).returning())
  await db.insert(messages).values([
    { threadId: thread.id, senderUserId: diaz.userId!, senderRole: 'customer', senderDisplay: 'Marcus Diaz', body: 'Any update on Gus today?', sentAt: wall(0, '14:08'), readAt: wall(0, '14:09') },
    { threadId: thread.id, senderUserId: tyler!.id, senderRole: 'staff', senderDisplay: 'Zoomez concierge', body: 'Pickup is anytime before 6.', sentAt: wall(0, '14:10'), readAt: wall(0, '14:11') },
    { threadId: thread.id, senderUserId: diaz.userId!, senderRole: 'customer', senderDisplay: 'Marcus Diaz', body: 'Is the deposit refundable if we cancel?', sentAt: wall(0, '14:12') },
  ])

  // --- Shifts: Tyler on shift today; Maria's pending claim tomorrow ---
  const todayShift = one(await db.insert(shifts).values({
    orgId: org.id, windowDate: day(0), windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
    windowStartUtc: wall(0, '07:00'), windowEndUtc: wall(0, '15:00'),
    status: 'approved', dogCount: 6, medRoundCount: 3,
  }).returning())
  await db.insert(shiftClaims).values({ shiftId: todayShift.id, staffId: tyler!.id, state: 'approved' })
  const tomorrowShift = one(await db.insert(shifts).values({
    orgId: org.id, windowDate: day(1), windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
    windowStartUtc: wall(1, '07:00'), windowEndUtc: wall(1, '15:00'),
    status: 'claimed', dogCount: 6, medRoundCount: 3,
  }).returning())
  await db.insert(shiftClaims).values({ shiftId: tomorrowShift.id, staffId: maria!.id, state: 'pending' })
  // Two OPEN shifts for the claim board (staff shift-board screen):
  await db.insert(shifts).values([
    {
      orgId: org.id, windowDate: day(2), windowStartLocal: '07:00', windowEndLocal: '15:00', timeZone: TZ,
      windowStartUtc: wall(2, '07:00'), windowEndUtc: wall(2, '15:00'),
      status: 'open', dogCount: 6, medRoundCount: 2,
    },
    {
      orgId: org.id, windowDate: day(3), windowStartLocal: '15:00', windowEndLocal: '21:00', timeZone: TZ,
      windowStartUtc: wall(3, '15:00'), windowEndUtc: wall(3, '21:00'),
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
    { customerId: sarah.id, templateId: waiver.id, templateVersion: 1, status: 'signed', signedAt: wall(-5, '11:00') },
    { customerId: diaz.id, templateId: waiver.id, templateVersion: 1, status: 'signed', signedAt: wall(-2, '12:00') },
    { customerId: kim.id, templateId: waiver.id, templateVersion: 1, status: 'missing' },
  ])

  // --- Audit trail (reports screen) ---
  await db.insert(auditEntries).values([
    { orgId: org.id, occurredAt: wall(0, '14:48'), tz: TZ, actorUserId: corey!.id, actorRole: 'manager', action: 'reservation.approve', subjectType: 'reservation', subjectId: gusReq.id, after: { status: 'approved' } },
    { orgId: org.id, occurredAt: wall(0, '14:41'), tz: TZ, actorUserId: brette!.id, actorRole: 'manager', action: 'thread.takeover', subjectType: 'thread', subjectId: thread.id },
    { orgId: org.id, occurredAt: wall(0, '14:38'), tz: TZ, actorUserId: corey!.id, actorRole: 'manager', action: 'care_task.override', subjectType: 'care_task', subjectId: doneJagAm.id, after: { outcome: 'given', override: true } },
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
