import { beforeAll, afterAll, expect, test } from 'vitest'
import { app } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
})
afterAll(async () => {
  await resetDb()
})

test('GET /api/v1/health reports ok with a live db', async () => {
  const res = await app.request('/api/v1/health')
  expect(res.status).toBe(200)
  const body = (await res.json()) as { status: string; db: string; version: string; time: string }
  expect(body).toMatchObject({ status: 'ok', db: 'ok', version: '0.1.0' })
  expect(typeof body.time).toBe('string')
})

test('unknown route returns the NOT_FOUND error envelope', async () => {
  const res = await app.request('/api/v1/nope')
  expect(res.status).toBe(404)
  const body = (await res.json()) as { error: { code: string } }
  expect(body.error.code).toBe('NOT_FOUND')
})
