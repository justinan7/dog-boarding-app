import { beforeAll, afterAll, expect, test } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { initDb, getDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { pets, customers, reservations, careTasks, messages, threads, shiftClaims } from '../src/db/schema'

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
})
afterAll(async () => {
  await resetDb()
})

test('seed loads the design world', async () => {
  const db = getDb()
  const allPets = await db.select().from(pets)
  expect(allPets.map((p) => p.name).sort()).toEqual(['Bella', 'Biscuit', 'Cooper', 'Luna', 'Max', 'Rocky'])
})

test('two booking requests are pending approval', async () => {
  const db = getDb()
  const pending = await db.select().from(reservations).where(eq(reservations.status, 'requested'))
  expect(pending).toHaveLength(2)
})

test('seed is idempotent — re-running does not duplicate', async () => {
  await seed()
  const db = getDb()
  const rows = await db.select().from(pets)
  expect(rows).toHaveLength(6) // still six, not twelve
})

test("Biscuit's owner and an overdue insulin task resolve through the graph", async () => {
  const db = getDb()
  const [biscuit] = await db
    .select({ pet: pets.name, owner: customers.name })
    .from(pets)
    .innerJoin(customers, eq(pets.customerId, customers.id))
    .where(eq(pets.name, 'Biscuit'))
  expect(biscuit).toEqual({ pet: 'Biscuit', owner: 'Sarah Mitchell' })

  const overdue = await db.select().from(careTasks).where(eq(careTasks.state, 'overdue'))
  expect(overdue).toHaveLength(1)
  expect(overdue[0]!.label).toBe('Insulin 4u')
})

test('the Diaz thread has a trailing unanswered customer message', async () => {
  const db = getDb()
  const [thread] = await db.select().from(threads).where(eq(threads.flags, ['unanswered']))
  const msgs = await db.select().from(messages).where(eq(messages.threadId, thread!.id))
  expect(msgs).toHaveLength(3)
  const last = msgs.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime()).at(-1)!
  expect(last.senderRole).toBe('customer')
  expect(last.readAt).toBeNull()
})

test('the active shift-claim unique index blocks a second active claim', async () => {
  const db = getDb()
  // Maria has a pending claim on the Jul-4 shift; a second active claim on the
  // same shift must violate the partial unique index (invariant 2).
  const [existing] = await db.select().from(shiftClaims).where(eq(shiftClaims.state, 'pending'))
  await expect(
    db.insert(shiftClaims).values({ shiftId: existing!.shiftId, staffId: existing!.staffId, state: 'pending' }),
  ).rejects.toThrow()
  // sanity: the guard is state-scoped, so a withdrawn duplicate is allowed
  const withdrawn = await db
    .insert(shiftClaims)
    .values({ shiftId: existing!.shiftId, staffId: existing!.staffId, state: 'withdrawn' })
    .returning()
  expect(withdrawn).toHaveLength(1)
  // cleanup so afterAll/idempotency of other files is unaffected (in-memory anyway)
  await db.delete(shiftClaims).where(and(eq(shiftClaims.state, 'withdrawn')))
})
