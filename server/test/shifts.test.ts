import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, getDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { eq } from 'drizzle-orm'
import { shifts, auditEntries } from '../src/db/schema'

let app: Awaited<ReturnType<typeof createApp>>
let managerCookie: string
let staffCookie: string

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

async function signUpAndIn(app: Awaited<ReturnType<typeof createApp>>, email: string, name: string) {
  await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!', name }),
  })
  const res = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  })
  return res.headers.get('set-cookie') ?? ''
}

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()
  managerCookie = await signUpAndIn(app, 'corey@zoomez.app', 'Corey')
  staffCookie = await signUpAndIn(app, 'maria@zoomez.app', 'Maria')
  // Elevate the manager session for M🔒 shift create/approve/deny.
  await app.request('/api/v1/me/elevate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: managerCookie },
    body: JSON.stringify({ pin: '1234' }),
  })
})
afterAll(async () => { await resetDb() })

function mgrReq(path: string, init?: RequestInit) {
  return app.request(path, { ...init, headers: { ...init?.headers, Cookie: managerCookie } })
}
function staffReq(path: string, init?: RequestInit) {
  return app.request(path, { ...init, headers: { ...init?.headers, Cookie: staffCookie } })
}

describe('shift board', () => {
  test('GET /api/v1/shifts lists seeded shifts', async () => {
    const res = await staffReq('/api/v1/shifts')
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ status: string }> }
    expect(body.items.length).toBeGreaterThanOrEqual(2)
  })

  test('POST /api/v1/shifts creates an open shift (manager)', async () => {
    const res = await mgrReq('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        windowDate: '2026-07-10',
        windowStartLocal: '07:00',
        windowEndLocal: '15:00',
        timeZone: 'America/Los_Angeles',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await json(res)) as { status: string }
    expect(body.status).toBe('open')
  })
})

describe('claim lifecycle', () => {
  let openShiftId: string

  test('create an open shift to claim', async () => {
    const res = await mgrReq('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        windowDate: '2026-07-11',
        windowStartLocal: '08:00',
        windowEndLocal: '16:00',
      }),
    })
    const body = (await json(res)) as { id: string }
    openShiftId = body.id
  })

  test('staff claims the shift → pending', async () => {
    const res = await staffReq(`/api/v1/shifts/${openShiftId}/claim`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = (await json(res)) as { claim: { state: string } }
    expect(body.claim.state).toBe('pending')
  })

  test('manager approves the claim → approved + audit entry', async () => {
    const res = await mgrReq(`/api/v1/shifts/${openShiftId}/claim/approve`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = (await json(res)) as { state: string }
    expect(body.state).toBe('approved')

    // Verify audit
    const db = getDb()
    const audits = await db.select().from(auditEntries).where(eq(auditEntries.subjectId, openShiftId))
    expect(audits.some((a) => a.action === 'shift_claim.approve')).toBe(true)
  })

  test('withdraw a pending claim', async () => {
    // Create another shift + claim to withdraw
    const createRes = await mgrReq('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ windowDate: '2026-07-12', windowStartLocal: '09:00', windowEndLocal: '17:00' }),
    })
    const { id } = (await json(createRes)) as { id: string }

    await staffReq(`/api/v1/shifts/${id}/claim`, { method: 'POST' })
    const withdrawRes = await staffReq(`/api/v1/shifts/${id}/claim`, { method: 'DELETE' })
    expect(withdrawRes.status).toBe(200)
    const body = (await json(withdrawRes)) as { state: string }
    expect(body.state).toBe('withdrawn')
  })

  test('deny a pending claim reopens the shift', async () => {
    const createRes = await mgrReq('/api/v1/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ windowDate: '2026-07-13', windowStartLocal: '07:00', windowEndLocal: '15:00' }),
    })
    const { id } = (await json(createRes)) as { id: string }

    await staffReq(`/api/v1/shifts/${id}/claim`, { method: 'POST' })
    const denyRes = await mgrReq(`/api/v1/shifts/${id}/claim/deny`, { method: 'POST' })
    expect(denyRes.status).toBe(200)

    // Shift should be back to open
    const db = getDb()
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1)
    expect(shift!.status).toBe('open')
  })
})
