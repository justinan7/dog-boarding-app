import { Hono } from 'hono'
import { eq, ilike, or, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { customers, users } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const customersRouter = new Hono<AppEnv>()

// GET /api/v1/customers?q=&cursor=&limit= — (S) search; paginated.
customersRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const q = c.req.query('q')
  const limit = Math.min(Number(c.req.query('limit') ?? 25), 100)
  const cursor = c.req.query('cursor')

  let query = db.select().from(customers).$dynamic()

  if (q) {
    query = query.where(or(
      ilike(customers.name, `%${q}%`),
      ilike(customers.email, `%${q}%`),
      ilike(customers.phone, `%${q}%`),
    ))
  }

  if (cursor) {
    query = query.where(and(sql`${customers.id} > ${cursor}`))
  }

  const rows = await query.orderBy(customers.createdAt).limit(limit + 1)
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

  return c.json({ items, nextCursor })
})

// POST /api/v1/customers — (M) create + optionally send invite.
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  sendInvite: z.boolean().optional(),
})

customersRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  // Resolve org from the acting user
  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (!actor || (actor.role !== 'manager' && actor.role !== 'staff')) {
    throw new AppError('FORBIDDEN', 'Only managers can create customers')
  }

  const body = createSchema.parse(await c.req.json())

  const [created] = await db.insert(customers).values({
    orgId: actor.orgId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    notes: body.notes,
  }).returning()

  // TODO(B12): if body.sendInvite && body.email, trigger a magic-link invite

  return c.json(created, 201)
})

// GET /api/v1/customers/:id — (S, or own)
customersRouter.get('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const [customer] = await db.select().from(customers).where(eq(customers.id, c.req.param('id'))).limit(1)
  if (!customer) throw new AppError('NOT_FOUND', 'Customer not found')

  return c.json(customer)
})

// PATCH /api/v1/customers/:id — (M, or own contact fields)
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

customersRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const db = getDb()
  const body = patchSchema.parse(await c.req.json())
  const [updated] = await db
    .update(customers)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(customers.id, c.req.param('id')))
    .returning()

  if (!updated) throw new AppError('NOT_FOUND', 'Customer not found')
  return c.json(updated)
})
