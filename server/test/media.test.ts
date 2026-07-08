import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { processImage } from '../src/jobs/media-process'
import sharp from 'sharp'

let app: Awaited<ReturnType<typeof createApp>>
let cookie: string

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()

  await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'corry@zoomez.app', password: 'Test1234!', name: 'Corry' }),
  })
  const res = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'corry@zoomez.app', password: 'Test1234!' }),
  })
  cookie = res.headers.get('set-cookie') ?? ''
})
afterAll(async () => { await resetDb() })

function authed(path: string, init?: RequestInit) {
  return app.request(path, { ...init, headers: { ...init?.headers, Cookie: cookie } })
}

describe('POST /api/v1/uploads', () => {
  test('returns a presigned URL and object key for a photo', async () => {
    const res = await authed('/api/v1/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'photo', contentType: 'image/jpeg', bytes: 500000 }),
    })
    expect(res.status).toBe(201)
    const body = (await json(res)) as { objectKey: string; uploadUrl: string; expiresAt: string }
    expect(body.objectKey).toMatch(/^u\/\d{4}\/\d{2}\//)
    expect(body.uploadUrl).toContain('zoomez-media')
    expect(body.expiresAt).toBeTruthy()
  })

  test('rejects files exceeding the size limit', async () => {
    const res = await authed('/api/v1/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'photo', contentType: 'image/jpeg', bytes: 30_000_000 }),
    })
    expect(res.status).toBe(422)
  })
})

describe('processImage (sharp pipeline)', () => {
  test('converts a JPEG buffer to canonical JPEG + thumbnail', async () => {
    // Generate a 800x600 test JPEG
    const testInput = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 128, g: 200, b: 180 } },
    }).jpeg().toBuffer()

    const result = await processImage(testInput)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.jpeg.length).toBeGreaterThan(0)
    expect(result.thumb.length).toBeGreaterThan(0)
    expect(result.thumb.length).toBeLessThan(result.jpeg.length)

    // Verify the thumbnail is resized
    const thumbMeta = await sharp(result.thumb).metadata()
    expect(thumbMeta.width).toBe(400) // THUMB_WIDTH
  })
})
