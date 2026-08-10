import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'

// Object-level authorization: a signed-in customer must not be able to touch
// ANOTHER customer's records by id. Unguessable UUIDs are not a control.

let app: Awaited<ReturnType<typeof createApp>>
let sarah: string // owns Rusty + Jag, has a thread + stays
let diaz: string  // the attacker in these tests — a real customer, wrong records
let tyler: string // staff — must retain full access

async function signIn(email: string, name: string): Promise<string> {
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

const as = (cookie: string) => (path: string, init?: RequestInit) =>
  app.request(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers, Cookie: cookie } })

let sarahPetId: string
let sarahThreadId: string
let sarahStayId: string
let careTaskId: string

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()

  sarah = await signIn('sarah@example.com', 'Sarah Mitchell')
  diaz = await signIn('diaz@example.com', 'Marcus Diaz')
  tyler = await signIn('tyler@zoomez.app', 'Tyler Torres')

  // Sarah's own ids (fetched as sarah — already scoped)
  const pets = (await (await as(sarah)('/api/v1/pets')).json()) as { items: Array<{ id: string; name: string }> }
  sarahPetId = pets.items.find((p) => p.name === 'Rusty')!.id
  const threads = (await (await as(sarah)('/api/v1/threads')).json()) as { items: Array<{ id: string }> }
  sarahThreadId = threads.items[0]!.id
  const stays = (await (await as(sarah)('/api/v1/reservations')).json()) as { items: Array<{ id: string; status: string }> }
  sarahStayId = stays.items.find((r) => r.status === 'approved')!.id
  const tasks = (await (await as(tyler)('/api/v1/care-tasks')).json()) as { items: Array<{ id: string }> }
  careTaskId = tasks.items[0]!.id
})

afterAll(async () => {
  await resetDb()
})

describe('cross-tenant access is denied (diaz vs sarah)', () => {
  test("pet detail: 404 for another customer's dog", async () => {
    expect((await as(diaz)(`/api/v1/pets/${sarahPetId}`)).status).toBe(404)
    expect((await as(sarah)(`/api/v1/pets/${sarahPetId}`)).status).toBe(200)
  })

  test("care profile: customers cannot rewrite ANY med schedule (403)", async () => {
    const body = JSON.stringify([{ kind: 'medication', label: 'EVIL', localTime: '08:00', timeZone: 'America/Los_Angeles' }])
    expect((await as(diaz)(`/api/v1/pets/${sarahPetId}/care-profile`, { method: 'PUT', body })).status).toBe(403)
    // even the OWNER doesn't edit the med schedule — staff manage it
    expect((await as(sarah)(`/api/v1/pets/${sarahPetId}/care-profile`, { method: 'PUT', body })).status).toBe(403)
    expect((await as(tyler)(`/api/v1/pets/${sarahPetId}/care-profile`, { method: 'PUT', body: JSON.stringify([]) })).status).toBe(200)
  })

  test("vaccinations: owner may add, another customer may not", async () => {
    const body = JSON.stringify({ type: 'test-record' })
    expect((await as(diaz)(`/api/v1/pets/${sarahPetId}/vaccinations`, { method: 'POST', body })).status).toBe(404)
    expect((await as(sarah)(`/api/v1/pets/${sarahPetId}/vaccinations`, { method: 'POST', body })).status).toBe(201)
  })

  test("threads: non-participant customer cannot read or post (404)", async () => {
    expect((await as(diaz)(`/api/v1/threads/${sarahThreadId}/messages`)).status).toBe(404)
    expect((await as(diaz)(`/api/v1/threads/${sarahThreadId}/messages`, {
      method: 'POST', body: JSON.stringify({ body: 'intrusion' }),
    })).status).toBe(404)
    expect((await as(sarah)(`/api/v1/threads/${sarahThreadId}/messages`)).status).toBe(200)
  })

  test("reservations: another customer cannot read or cancel (404)", async () => {
    expect((await as(diaz)(`/api/v1/reservations/${sarahStayId}`)).status).toBe(404)
    expect((await as(diaz)(`/api/v1/reservations/${sarahStayId}/cancel`, { method: 'POST', body: '{}' })).status).toBe(404)
    expect((await as(sarah)(`/api/v1/reservations/${sarahStayId}`)).status).toBe(200)
  })
})

describe('staff-surface endpoints reject customers', () => {
  test('customer PII list is staff-only', async () => {
    expect((await as(diaz)('/api/v1/customers')).status).toBe(403)
    expect((await as(tyler)('/api/v1/customers')).status).toBe(200)
  })

  test('care tasks cannot be completed or created by customers', async () => {
    expect((await as(diaz)(`/api/v1/care-tasks/${careTaskId}/complete`, {
      method: 'POST', body: JSON.stringify({ outcome: 'given' }),
    })).status).toBe(403)
  })

  test('incidents are staff-only (file + read)', async () => {
    expect((await as(diaz)('/api/v1/incidents')).status).toBe(403)
  })

  test('report cards cannot be authored by customers', async () => {
    expect((await as(diaz)('/api/v1/report-cards', {
      method: 'POST',
      body: JSON.stringify({ reservationId: sarahStayId, petId: sarahPetId, date: '2026-01-01' }),
    })).status).toBe(403)
  })

  test('check-in/check-out are staff-only', async () => {
    expect((await as(diaz)(`/api/v1/reservations/${sarahStayId}/check-in`, { method: 'POST', body: '{}' })).status).toBe(403)
  })
})
