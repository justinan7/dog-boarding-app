import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import {
  pets, careProfileItems, vaccinationRecords, petSafetyFlags, doNotPair,
} from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const petsRouter = new Hono<AppEnv>()

// GET /api/v1/pets?customerId= — (S, or own)
petsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const customerId = c.req.query('customerId')
  const limit = Math.min(Number(c.req.query('limit') ?? 25), 100)
  const cursor = c.req.query('cursor')

  let query = db.select().from(pets).$dynamic()
  if (customerId) query = query.where(eq(pets.customerId, customerId))
  if (cursor) query = query.where(and(sql`${pets.id} > ${cursor}`))

  const rows = await query.orderBy(pets.createdAt).limit(limit + 1)
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return c.json({ items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null })
})

// POST /api/v1/pets
const createPetSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1),
  breed: z.string().optional(),
  weightLb: z.number().int().positive().optional(),
  birthYear: z.number().int().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  vetContact: z.string().optional(),
  behaviorNotes: z.string().optional(),
})

petsRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = createPetSchema.parse(await c.req.json())
  const db = getDb()
  const [pet] = await db.insert(pets).values(body).returning()
  return c.json(pet, 201)
})

// PATCH /api/v1/pets/:id
const patchPetSchema = z.object({
  name: z.string().min(1).optional(),
  breed: z.string().optional(),
  weightLb: z.number().int().positive().optional(),
  birthYear: z.number().int().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  vetContact: z.string().optional(),
  behaviorNotes: z.string().optional(),
})

petsRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = patchPetSchema.parse(await c.req.json())
  const db = getDb()
  const [updated] = await db.update(pets).set({ ...body, updatedAt: new Date() }).where(eq(pets.id, c.req.param('id'))).returning()
  if (!updated) throw new AppError('NOT_FOUND', 'Pet not found')
  return c.json(updated)
})

// GET /api/v1/pets/:id — full profile with care items, vax, flags
petsRouter.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const petId = c.req.param('id')

  const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1)
  if (!pet) throw new AppError('NOT_FOUND', 'Pet not found')

  const [careProfile, vaccinations, safetyFlagRows] = await Promise.all([
    db.select().from(careProfileItems).where(eq(careProfileItems.petId, petId)),
    db.select().from(vaccinationRecords).where(eq(vaccinationRecords.petId, petId)),
    db.select().from(petSafetyFlags).where(eq(petSafetyFlags.petId, petId)),
  ])

  return c.json({
    ...pet,
    careProfile,
    vaccinations,
    safetyFlags: safetyFlagRows.map((f) => f.flag),
  })
})

// PUT /api/v1/pets/:id/care-profile — full-list replace
const careItemSchema = z.object({
  kind: z.enum(['feeding', 'medication', 'task']),
  label: z.string().min(1),
  dose: z.string().optional(),
  localTime: z.string().regex(/^\d{2}:\d{2}$/),
  timeZone: z.string().min(1),
  days: z.array(z.string()).optional(),
  instructions: z.string().optional(),
})

petsRouter.put('/:id/care-profile', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const items = z.array(careItemSchema).parse(await c.req.json())
  const petId = c.req.param('id')
  const db = getDb()

  // Full replace: delete old, insert new, in one transaction-like sequence.
  await db.delete(careProfileItems).where(eq(careProfileItems.petId, petId))
  if (items.length > 0) {
    await db.insert(careProfileItems).values(items.map((i) => ({ ...i, petId })))
  }

  const rows = await db.select().from(careProfileItems).where(eq(careProfileItems.petId, petId))
  return c.json(rows)
})

// POST /api/v1/pets/:id/vaccinations
const vaxSchema = z.object({
  type: z.string().min(1),
  expiresOn: z.string().optional(),
  documentObjectKey: z.string().optional(),
})

petsRouter.post('/:id/vaccinations', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = vaxSchema.parse(await c.req.json())
  const db = getDb()
  const [vax] = await db.insert(vaccinationRecords).values({
    petId: c.req.param('id'),
    ...body,
  }).returning()
  return c.json(vax, 201)
})

// DELETE /api/v1/vaccinations/:id
petsRouter.delete('/vaccinations/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const [deleted] = await db.delete(vaccinationRecords).where(eq(vaccinationRecords.id, c.req.param('id'))).returning()
  if (!deleted) throw new AppError('NOT_FOUND', 'Vaccination record not found')
  return c.json(deleted)
})

// PUT /api/v1/pets/:id/safety-flags — full replace
petsRouter.put('/:id/safety-flags', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const { flags } = z.object({ flags: z.array(z.string()) }).parse(await c.req.json())
  const petId = c.req.param('id')
  const db = getDb()

  await db.delete(petSafetyFlags).where(eq(petSafetyFlags.petId, petId))
  if (flags.length > 0) {
    await db.insert(petSafetyFlags).values(flags.map((flag) => ({ petId, flag })))
  }

  const rows = await db.select().from(petSafetyFlags).where(eq(petSafetyFlags.petId, petId))
  return c.json(rows.map((r) => r.flag))
})

// POST /api/v1/pets/:id/do-not-pair
petsRouter.post('/:id/do-not-pair', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const { otherPetId } = z.object({ otherPetId: z.string().uuid() }).parse(await c.req.json())
  const petId = c.req.param('id')
  const db = getDb()

  // Canonical ordering: smaller UUID first
  const [petAId, petBId] = petId < otherPetId ? [petId, otherPetId] : [otherPetId, petId]

  const [pair] = await db.insert(doNotPair).values({ petAId, petBId }).returning()
  return c.json(pair, 201)
})

// DELETE /api/v1/pets/:id/do-not-pair/:otherPetId
petsRouter.delete('/:id/do-not-pair/:otherPetId', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const petId = c.req.param('id')
  const otherPetId = c.req.param('otherPetId')
  const [petAId, petBId] = petId < otherPetId ? [petId, otherPetId] : [otherPetId, petId]
  const db = getDb()

  const [deleted] = await db.delete(doNotPair)
    .where(and(eq(doNotPair.petAId, petAId), eq(doNotPair.petBId, petBId)))
    .returning()
  if (!deleted) throw new AppError('NOT_FOUND', 'Pairing not found')
  return c.json(deleted)
})
