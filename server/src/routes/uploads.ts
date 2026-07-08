import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { AppError } from '../lib/errors'
import { generatePresignedPut } from '../lib/storage'
import type { AppEnv } from '../lib/hono-env'

export const uploadsRouter = new Hono<AppEnv>()

const MAX_PHOTO_BYTES = 25 * 1024 * 1024 // 25 MB
const MAX_DOC_BYTES = 15 * 1024 * 1024

const uploadSchema = z.object({
  kind: z.enum(['photo', 'document']),
  contentType: z.string().min(1),
  bytes: z.number().int().positive(),
})

// POST /api/v1/uploads — contract §5.1
// Returns a presigned PUT URL for direct-to-storage upload + the objectKey the
// client references in subsequent calls (message attachment, vax record, etc.).
uploadsRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()
  const body = uploadSchema.parse(await c.req.json())

  const maxBytes = body.kind === 'photo' ? MAX_PHOTO_BYTES : MAX_DOC_BYTES
  if (body.bytes > maxBytes) {
    throw new AppError('VALIDATION', `File too large (max ${maxBytes / 1024 / 1024} MB)`)
  }

  const [actor] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
  if (!actor) throw new AppError('FORBIDDEN', 'User not found')

  // Generate an object key: u/<year>/<month>/<uuid>.<ext>
  const now = new Date()
  const ext = body.contentType.split('/')[1] ?? 'bin'
  const objectKey = `u/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`

  const bucket = body.kind === 'photo' ? 'zoomez-media' : 'zoomez-docs'
  const { uploadUrl, expiresAt } = await generatePresignedPut(bucket, objectKey, body.contentType)

  // TODO(B8): after the client PUTs, enqueue a pg-boss job to process the
  // upload (HEIC→JPEG + thumbnail generation via sharp). The job checks that
  // the object exists, transcodes, and writes the canonical variants.

  return c.json({ objectKey, uploadUrl, expiresAt }, 201)
})
