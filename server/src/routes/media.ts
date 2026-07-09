import { Hono } from 'hono'
import { AppError } from '../lib/errors'
import { getMediaStore, mimeForKey, BUCKET_MEDIA, BUCKET_DOCS } from '../lib/media-store'
import { log } from '../lib/log'
import type { AppEnv } from '../lib/hono-env'

export const mediaRouter = new Hono<AppEnv>()

const MAX_PHOTO_BYTES = 25 * 1024 * 1024
const MAX_DOC_BYTES = 15 * 1024 * 1024

// POST /api/v1/media?kind=photo|document — upload THROUGH the API (ADR-013).
// Photos are normalized in-request with sharp: EXIF-rotated, capped at 2048px,
// re-encoded JPEG, plus a 512px square thumbnail (`<key>_t.jpg`). Documents
// (vax records) are stored as-is. Returns the objectKey the client references
// in messages / report cards / incidents / vaccination records.
mediaRouter.post('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const kind = c.req.query('kind') === 'document' ? 'document' : 'photo'
  const contentType = c.req.header('content-type') ?? 'application/octet-stream'
  const raw = Buffer.from(await c.req.arrayBuffer())

  const max = kind === 'photo' ? MAX_PHOTO_BYTES : MAX_DOC_BYTES
  if (raw.length === 0) throw new AppError('VALIDATION', 'Empty upload')
  if (raw.length > max) throw new AppError('VALIDATION', `File too large (max ${max / 1024 / 1024} MB)`)

  const store = getMediaStore()
  const now = new Date()
  const id = crypto.randomUUID()
  const prefix = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`

  if (kind === 'document') {
    const ext = contentType === 'application/pdf' ? 'pdf'
      : contentType.startsWith('image/') ? (contentType.split('/')[1] ?? 'bin') : 'bin'
    const objectKey = `d/${prefix}/${id}.${ext}`
    await store.put(BUCKET_DOCS, objectKey, raw, contentType)
    return c.json({ objectKey }, 201)
  }

  // Photo: normalize via sharp. If the format can't be decoded (e.g. HEIC on a
  // prebuilt libvips without HEIF), store the original untouched — the bytes
  // are never lost, they just skip normalization.
  const { default: sharp } = await import('sharp')
  try {
    const base = sharp(raw, { failOn: 'none' }).rotate()
    const full = await base
      .clone()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    const thumb = await base
      .clone()
      .resize({ width: 512, height: 512, fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer()

    const objectKey = `m/${prefix}/${id}.jpg`
    const thumbKey = `m/${prefix}/${id}_t.jpg`
    await store.put(BUCKET_MEDIA, objectKey, full.data, 'image/jpeg')
    await store.put(BUCKET_MEDIA, thumbKey, thumb, 'image/jpeg')
    return c.json({ objectKey, thumbKey, width: full.info.width, height: full.info.height }, 201)
  } catch (err) {
    log.warn({ err: (err as Error).message, contentType }, 'sharp could not process upload — storing original')
    const ext = contentType.startsWith('image/') ? (contentType.split('/')[1] ?? 'bin') : 'bin'
    const objectKey = `m/${prefix}/${id}.${ext}`
    await store.put(BUCKET_MEDIA, objectKey, raw, contentType)
    return c.json({ objectKey, thumbKey: null }, 201)
  }
})

// GET /api/v1/media/* — stream a stored object (auth'd; same-origin <img> tags
// send the session cookie automatically). Keys are immutable UUIDs → cache hard.
const KEY_RE = /^[md]\/\d{4}\/\d{2}\/[0-9a-f-]{36}(_t)?\.[a-z0-9]{2,5}$/

mediaRouter.get('/*', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')

  const key = c.req.path.replace(/^\/api\/v1\/media\//, '')
  if (!KEY_RE.test(key)) throw new AppError('NOT_FOUND', 'Media not found')

  const bucket = key.startsWith('d/') ? BUCKET_DOCS : BUCKET_MEDIA
  const obj = await getMediaStore().get(bucket, key)
  if (!obj) throw new AppError('NOT_FOUND', 'Media not found')

  return c.body(new Uint8Array(obj.body), 200, {
    'Content-Type': obj.contentType || mimeForKey(key),
    'Cache-Control': 'private, max-age=31536000, immutable',
  })
})
