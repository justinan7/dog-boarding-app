import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { reportCards, pets } from '../db/schema'
import { AppError } from '../lib/errors'
import { ownCustomerId } from '../lib/domain-user'
import { publishStaff } from '../lib/realtime'
import type { AppEnv } from '../lib/hono-env'

export const reportCardsRouter = new Hono<AppEnv>()

// GET /api/v1/report-cards?petId=&reservationId=
reportCardsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const petId = c.req.query('petId')
  const reservationId = c.req.query('reservationId')

  let query = db
    .select({
      id: reportCards.id, reservationId: reportCards.reservationId, petId: reportCards.petId,
      petName: pets.name, date: reportCards.date, status: reportCards.status,
      mood: reportCards.mood, appetite: reportCards.appetite,
      photoObjectKeys: reportCards.photoObjectKeys, bestMoment: reportCards.bestMoment,
      careLogSummary: reportCards.careLogSummary, sentAt: reportCards.sentAt,
      heartedAt: reportCards.heartedAt,
    })
    .from(reportCards)
    .innerJoin(pets, eq(reportCards.petId, pets.id))
    .$dynamic()

  // Customers only see cards for their own pets — and only SENT ones (drafts
  // are staff work-in-progress).
  const du = c.get('domainUser')
  const conds = []
  if (du?.role === 'customer') {
    const custId = await ownCustomerId(du)
    if (!custId) return c.json({ items: [] })
    conds.push(eq(pets.customerId, custId), eq(reportCards.status, 'sent'))
  }
  if (petId) conds.push(eq(reportCards.petId, petId))
  if (reservationId) conds.push(eq(reportCards.reservationId, reservationId))
  if (conds.length > 0) query = query.where(and(...conds))

  const rows = await query.orderBy(desc(reportCards.date)).limit(50)
  return c.json({ items: rows })
})

// POST /api/v1/report-cards — create a draft
const createSchema = z.object({
  reservationId: z.string().uuid(),
  petId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  photoKeys: z.array(z.string()).optional(),
  mood: z.string().optional(),
  appetite: z.string().optional(),
  bestMoment: z.string().optional(),
  includeCareLog: z.boolean().optional(),
})

reportCardsRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const body = createSchema.parse(await c.req.json())
  const db = getDb()

  const [card] = await db.insert(reportCards).values({
    reservationId: body.reservationId,
    petId: body.petId,
    date: body.date,
    mood: body.mood,
    appetite: body.appetite,
    bestMoment: body.bestMoment,
    photoObjectKeys: body.photoKeys,
    status: 'draft',
  }).returning()

  return c.json(card, 201)
})

// PATCH /api/v1/report-cards/:id — update a draft
reportCardsRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [card] = await db.select().from(reportCards).where(eq(reportCards.id, c.req.param('id'))).limit(1)
  if (!card) throw new AppError('NOT_FOUND', 'Report card not found')
  if (card.status !== 'draft') throw new AppError('CONFLICT', 'Can only edit drafts')

  const body = z.object({
    mood: z.string().optional(),
    appetite: z.string().optional(),
    bestMoment: z.string().optional(),
    photoKeys: z.array(z.string()).optional(),
  }).parse(await c.req.json())

  const [updated] = await db.update(reportCards).set({
    mood: body.mood ?? card.mood,
    appetite: body.appetite ?? card.appetite,
    bestMoment: body.bestMoment ?? card.bestMoment,
    photoObjectKeys: body.photoKeys ?? card.photoObjectKeys,
  }).where(eq(reportCards.id, card.id)).returning()

  return c.json(updated)
})

// POST /api/v1/report-cards/:id/send — mark as sent
reportCardsRouter.post('/:id/send', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [updated] = await db.update(reportCards)
    .set({ status: 'sent', sentAt: new Date() })
    .where(and(eq(reportCards.id, c.req.param('id')), eq(reportCards.status, 'draft')))
    .returning()
  if (!updated) throw new AppError('CONFLICT', 'Report card not found or already sent')

  // TODO(B12): post the card into the customer's thread
  void publishStaff({ kind: 'report-card' })
  return c.json(updated)
})

// POST /api/v1/report-cards/:id/heart — customer reaction
reportCardsRouter.post('/:id/heart', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const [updated] = await db.update(reportCards)
    .set({ heartedAt: new Date() })
    .where(eq(reportCards.id, c.req.param('id')))
    .returning()
  if (!updated) throw new AppError('NOT_FOUND', 'Report card not found')
  return c.json(updated)
})
