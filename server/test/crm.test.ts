import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'

let app: Awaited<ReturnType<typeof createApp>>
let cookie: string
let sarahCookie: string

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()

  // Sign up + sign in as seeded STAFF (jack) — the CRM surface is staff-facing,
  // and customer-role sessions are scoped to their own records.
  await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jack@zoomez.app', password: 'Test1234!', name: 'Jack Torres' }),
  })
  const signInRes = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jack@zoomez.app', password: 'Test1234!' }),
  })
  cookie = signInRes.headers.get('set-cookie') ?? ''

  // And a customer session (sarah) to assert "(C) own" scoping.
  await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@example.com', password: 'Test1234!', name: 'Sarah Mitchell' }),
  })
  const sarahRes = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@example.com', password: 'Test1234!' }),
  })
  sarahCookie = sarahRes.headers.get('set-cookie') ?? ''
})

afterAll(async () => {
  await resetDb()
})

function authed(path: string, init?: RequestInit) {
  return app.request(path, {
    ...init,
    headers: { ...init?.headers, Cookie: cookie },
  })
}

describe('GET /api/v1/customers', () => {
  test('returns the seeded customers', async () => {
    const res = await authed('/api/v1/customers')
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ name: string }>; nextCursor: string | null }
    expect(body.items.length).toBeGreaterThanOrEqual(5) // seeded 5 customers
    const names = body.items.map((c) => c.name)
    expect(names).toContain('Sarah Mitchell')
    expect(names).toContain('Marcus Diaz')
  })

  test('search with ?q= filters by name', async () => {
    const res = await authed('/api/v1/customers?q=Sarah')
    const body = (await json(res)) as { items: Array<{ name: string }> }
    expect(body.items.every((c) => c.name.includes('Sarah'))).toBe(true)
  })
})

describe('GET /api/v1/customers/:id', () => {
  test('returns a specific customer', async () => {
    const listRes = await authed('/api/v1/customers')
    const { items } = (await json(listRes)) as { items: Array<{ id: string; name: string }> }
    const sarah = items.find((c) => c.name === 'Sarah Mitchell')!

    const res = await authed(`/api/v1/customers/${sarah.id}`)
    expect(res.status).toBe(200)
    const body = (await json(res)) as { name: string }
    expect(body.name).toBe('Sarah Mitchell')
  })

  test('404 for a nonexistent id', async () => {
    const res = await authed('/api/v1/customers/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})

describe('pets CRUD', () => {
  test('GET /api/v1/pets?customerId= returns the seeded pets', async () => {
    const listRes = await authed('/api/v1/customers')
    const { items } = (await json(listRes)) as { items: Array<{ id: string; name: string }> }
    const sarah = items.find((c) => c.name === 'Sarah Mitchell')!

    const res = await authed(`/api/v1/pets?customerId=${sarah.id}`)
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ name: string }> }
    const names = body.items.map((p) => p.name).sort()
    expect(names).toEqual(['Bella', 'Biscuit'])
  })

  test('a customer sees only their OWN pets, whatever they query', async () => {
    // sarah asks for ALL pets — the server forces the scope to her own two.
    const res = await app.request('/api/v1/pets', { headers: { Cookie: sarahCookie } })
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ name: string }> }
    expect(body.items.map((p) => p.name).sort()).toEqual(['Bella', 'Biscuit'])
  })

  test('GET /api/v1/pets/:id returns full profile with care items + vaccinations + flags', async () => {
    const allRes = await authed('/api/v1/pets')
    const { items } = (await json(allRes)) as { items: Array<{ id: string; name: string }> }
    const biscuit = items.find((p) => p.name === 'Biscuit')!

    const res = await authed(`/api/v1/pets/${biscuit.id}`)
    expect(res.status).toBe(200)
    const body = (await json(res)) as {
      name: string
      careProfile: Array<{ label: string }>
      vaccinations: Array<{ type: string; status: string }>
      safetyFlags: string[]
    }
    expect(body.name).toBe('Biscuit')
    expect(body.careProfile.length).toBeGreaterThanOrEqual(2) // Rimadyl + Breakfast + Dinner
    expect(body.vaccinations.find((v) => v.type === 'bordetella')?.status).toBe('expired')
  })

  test('PUT /api/v1/pets/:id/care-profile replaces all items', async () => {
    const allRes = await authed('/api/v1/pets')
    const { items } = (await json(allRes)) as { items: Array<{ id: string; name: string }> }
    const biscuit = items.find((p) => p.name === 'Biscuit')!

    const newProfile = [
      { kind: 'feeding', label: 'Breakfast', dose: '2 cups', localTime: '07:00', timeZone: 'America/Los_Angeles' },
    ]
    const res = await authed(`/api/v1/pets/${biscuit.id}/care-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{ label: string }>
    expect(body).toHaveLength(1)
    expect(body[0]!.label).toBe('Breakfast')
  })
})
