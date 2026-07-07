import { beforeAll, afterAll, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'
import { initDb, getDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { organizations, users, customers, pets } from '../src/db/schema'

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
})
afterAll(async () => {
  await resetDb()
})

test('migrations create the schema; a customer + pet round-trips through FKs', async () => {
  const db = getDb()

  const [org] = await db.insert(organizations).values({ name: 'Zoomez' }).returning()
  expect(org?.id).toBeDefined()

  await db.insert(users).values({
    orgId: org!.id,
    role: 'manager',
    email: 'corry@zoomez.app',
    displayName: 'Corry',
  })

  const [customer] = await db
    .insert(customers)
    .values({ orgId: org!.id, name: 'Sarah Mitchell', email: 'sarah@example.com' })
    .returning()

  await db.insert(pets).values({
    customerId: customer!.id,
    name: 'Biscuit',
    breed: 'Beagle',
    weightLb: 24,
    sex: 'male',
  })

  const rows = await db
    .select({ pet: pets.name, breed: pets.breed, owner: customers.name })
    .from(pets)
    .innerJoin(customers, eq(pets.customerId, customers.id))

  expect(rows).toEqual([{ pet: 'Biscuit', breed: 'Beagle', owner: 'Sarah Mitchell' }])
})

test('the role enum rejects an invalid value', async () => {
  const db = getDb()
  const [org] = await db.insert(organizations).values({ name: 'Org2' }).returning()
  await expect(
    // @ts-expect-error — 'owner' is not a valid role; the pg enum must reject it
    db.insert(users).values({ orgId: org!.id, role: 'owner', email: 'x@y.z', displayName: 'X' }),
  ).rejects.toThrow()
})
