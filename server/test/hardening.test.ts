import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { zonedWallTimeToUtc } from '../src/lib/time'

describe('zonedWallTimeToUtc — DST-correct (invariant 4)', () => {
  test('America/Los_Angeles is PDT (-7) in July', () => {
    const utc = zonedWallTimeToUtc('2026-07-04', '08:00', 'America/Los_Angeles')
    expect(utc.toISOString()).toBe('2026-07-04T15:00:00.000Z')
  })

  test('America/Los_Angeles is PST (-8) in January — DST handled', () => {
    const utc = zonedWallTimeToUtc('2026-01-04', '08:00', 'America/Los_Angeles')
    expect(utc.toISOString()).toBe('2026-01-04T16:00:00.000Z')
  })

  test('a different zone (America/New_York, EDT -4) resolves correctly', () => {
    const utc = zonedWallTimeToUtc('2026-07-04', '08:00', 'America/New_York')
    expect(utc.toISOString()).toBe('2026-07-04T12:00:00.000Z')
  })
})

describe('authorization enforcement', () => {
  let app: Awaited<ReturnType<typeof createApp>>
  let customerCookie: string
  let managerCookieUnelevated: string

  beforeAll(async () => {
    await initDb('pglite://memory')
    await runMigrations()
    await seed()
    app = await createApp()

    async function signIn(email: string, name: string) {
      await app.request('/api/auth/sign-up/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Test1234!', name }),
      })
      const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Test1234!' }),
      })
      return res.headers.get('set-cookie') ?? ''
    }

    customerCookie = await signIn('newcustomer@example.com', 'New Customer') // self-provisioned customer
    managerCookieUnelevated = await signIn('corry@zoomez.app', 'Corry') // seeded manager, NOT elevated
  })
  afterAll(async () => { await resetDb() })

  test('a self-signed-up customer is provisioned with a bookable customer record', async () => {
    const res = await app.request('/api/v1/me', { headers: { Cookie: customerCookie } })
    const body = (await res.json()) as { role: string; customerId: string | null }
    expect(body.role).toBe('customer')
    expect(body.customerId).not.toBeNull() // provisioning created the customers row
  })

  test('a customer cannot reach a manager (M🔒) endpoint', async () => {
    const res = await app.request('/api/v1/reports/summary', { headers: { Cookie: customerCookie } })
    expect(res.status).toBe(403)
  })

  test('a manager without elevation gets ELEVATION_REQUIRED on a M🔒 endpoint', async () => {
    const res = await app.request('/api/v1/reports/summary', { headers: { Cookie: managerCookieUnelevated } })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ELEVATION_REQUIRED')
  })

  test('after elevating, the manager can reach the M🔒 endpoint', async () => {
    await app.request('/api/v1/me/elevate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: managerCookieUnelevated },
      body: JSON.stringify({ pin: '1234' }),
    })
    const res = await app.request('/api/v1/reports/summary', { headers: { Cookie: managerCookieUnelevated } })
    expect(res.status).toBe(200)
  })
})
