import { Hono } from 'hono'
import { eq, sql, desc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { incidentReports, users, auditEntries } from '../db/schema'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../lib/hono-env'

export const incidentsRouter = new Hono<AppEnv>()

// POST /api/v1/incidents — (S) file an incident
const createSchema = z.object({
  type: z.enum(['bite', 'injury', 'escape', 'illness', 'other']),
  severity: z.enum(['minor', 'moderate', 'severe']),
  petIds: z.array(z.string().uuid()),
  occurredAt: z.string(),
  description: z.string().min(1),
  photoObjectKeys: z.array(z.string()).optional(),
  actionsTaken: z.array(z.string()).optional(),
  notifyOwnerNow: z.boolean().optional(),
  reservationId: z.string().uuid().optional(),
})

incidentsRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const body = createSchema.parse(await c.req.json())

  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  const [incident] = await db.insert(incidentReports).values({
    orgId: actor.orgId,
    reservationId: body.reservationId,
    type: body.type,
    severity: body.severity,
    petIds: body.petIds,
    occurredAt: new Date(body.occurredAt),
    description: body.description,
    photoObjectKeys: body.photoObjectKeys,
    actionsTaken: body.actionsTaken,
    ownerNotified: body.notifyOwnerNow ?? false,
    reportedByUserId: actor.id,
  }).returning()

  // Severe incidents push management immediately (audit)
  if (body.severity === 'severe') {
    await db.insert(auditEntries).values({
      orgId: actor.orgId,
      actorUserId: actor.id,
      actorRole: actor.role as 'staff',
      action: 'incident.severe',
      subjectType: 'incident',
      subjectId: incident!.id,
    })
  }

  return c.json(incident, 201)
})

// GET /api/v1/incidents?petId= — (S)
incidentsRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const petId = c.req.query('petId')
  let query = db.select().from(incidentReports).$dynamic()
  if (petId) {
    // petIds is a uuid[]; use array containment (@>) to match reports involving this pet.
    query = query.where(sql`${incidentReports.petIds} @> ARRAY[${petId}]::uuid[]`)
  }
  const rows = await query.orderBy(desc(incidentReports.occurredAt)).limit(50)
  return c.json({ items: rows })
})
