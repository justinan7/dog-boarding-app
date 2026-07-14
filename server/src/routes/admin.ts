import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { users, customers, auditEntries } from '../db/schema'
import { user as authUser } from '../db/schema/better-auth'
import { AppError } from '../lib/errors'
import { requireRole, requireElevation } from '../middleware/guards'
import type { AppEnv } from '../lib/hono-env'

// Admin surface (system operator): user & role management. Roles previously
// only existed via the seed — this is how real staff/managers get added.
// Everything here is admin-only AND PIN-elevated, and audited.
export const adminRouter = new Hono<AppEnv>()

adminRouter.use('*', requireRole('admin'), requireElevation)

// GET /api/v1/admin/users — every domain user + whether they've signed up yet.
adminRouter.get('/users', async (c) => {
  const db = getDb()
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
      hasLogin: sql<boolean>`${authUser.id} IS NOT NULL`,
    })
    .from(users)
    .leftJoin(authUser, eq(authUser.email, users.email))
    .orderBy(users.createdAt)
  return c.json({ items: rows })
})

// POST /api/v1/admin/users — invite by email: pre-create the domain user with
// a role; when that email signs up, the session middleware links it (the same
// mechanism the seed uses). Customers also get their bookable record.
const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['customer', 'staff', 'manager', 'admin']),
})

adminRouter.post('/users', async (c) => {
  const du = c.get('domainUser')!
  const body = createSchema.parse(await c.req.json())
  const db = getDb()

  const email = body.email.toLowerCase().trim()
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) throw new AppError('CONFLICT', 'A user with that email already exists')

  const [created] = await db.insert(users).values({
    orgId: du.orgId,
    role: body.role,
    email,
    displayName: body.name.trim(),
  }).returning()

  if (body.role === 'customer') {
    await db.insert(customers).values({
      orgId: du.orgId, name: body.name.trim(), email,
    })
  }

  await db.insert(auditEntries).values({
    orgId: du.orgId, actorUserId: du.id, actorRole: 'manager',
    action: 'admin.user_create', subjectType: 'user', subjectId: created!.id,
    after: { email, role: body.role },
  })

  return c.json(created, 201)
})

// PATCH /api/v1/admin/users/:id — change a user's role.
const patchSchema = z.object({
  role: z.enum(['customer', 'staff', 'manager', 'admin']),
})

adminRouter.patch('/users/:id', async (c) => {
  const du = c.get('domainUser')!
  const body = patchSchema.parse(await c.req.json())
  const db = getDb()
  const id = c.req.param('id')

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!target) throw new AppError('NOT_FOUND', 'User not found')
  if (target.role === body.role) return c.json(target)

  // Never demote the last admin — that would lock the system surface shut.
  if (target.role === 'admin') {
    const [row] = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(users).where(eq(users.role, 'admin'))
    if (Number(row?.count ?? 0) <= 1) throw new AppError('CONFLICT', 'Cannot demote the last admin')
  }

  const [updated] = await db.update(users)
    .set({ role: body.role })
    .where(eq(users.id, id))
    .returning()

  // Customers need their bookable record when demoted/converted to customer.
  if (body.role === 'customer') {
    const [cust] = await db.select().from(customers).where(
      and(eq(customers.userId, id)),
    ).limit(1)
    if (!cust) {
      const [byEmail] = await db.select().from(customers).where(eq(customers.email, target.email)).limit(1)
      if (!byEmail) {
        await db.insert(customers).values({
          orgId: du.orgId, userId: id, name: target.displayName, email: target.email,
        })
      }
    }
  }

  await db.insert(auditEntries).values({
    orgId: du.orgId, actorUserId: du.id, actorRole: 'manager',
    action: 'admin.role_change', subjectType: 'user', subjectId: id,
    before: { role: target.role }, after: { role: body.role },
  })

  return c.json(updated)
})
