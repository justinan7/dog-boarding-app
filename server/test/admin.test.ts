import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'

let app: Awaited<ReturnType<typeof createApp>>
let adminCookie: string
let managerCookie: string

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

async function elevate(cookie: string) {
  await app.request('/api/v1/me/elevate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ pin: '1234' }),
  })
}

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()

  adminCookie = await signIn('justin@4nunns.com', 'Justin')   // seeded admin
  managerCookie = await signIn('corey@zoomez.app', 'Corey')   // seeded manager
  await elevate(adminCookie)
  await elevate(managerCookie)
})

afterAll(async () => {
  await resetDb()
})

const authed = (cookie: string) => (path: string, init?: RequestInit) =>
  app.request(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers, Cookie: cookie } })

describe('admin role', () => {
  test('justin@4nunns.com is seeded as admin (and gets staffId)', async () => {
    const res = await authed(adminCookie)('/api/v1/me')
    const me = (await res.json()) as { role: string; staffId: string | null }
    expect(me.role).toBe('admin')
    expect(me.staffId).not.toBeNull()
  })

  test('admin passes manager-only role checks (superset)', async () => {
    // shift claim requires role staff/manager — admin must pass the ROLE gate
    // (404 for a bogus id proves we got past the guard).
    const res = await authed(adminCookie)('/api/v1/shifts/00000000-0000-0000-0000-000000000000/claim', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  test('GET /admin/users lists everyone with hasLogin', async () => {
    const res = await authed(adminCookie)('/api/v1/admin/users')
    expect(res.status).toBe(200)
    const { items } = (await res.json()) as { items: Array<{ email: string; role: string; hasLogin: boolean }> }
    const justin = items.find((u) => u.email === 'justin@4nunns.com')!
    const tyler = items.find((u) => u.email === 'tyler@zoomez.app')!
    expect(justin.role).toBe('admin')
    expect(justin.hasLogin).toBe(true)
    expect(tyler.hasLogin).toBe(false) // seeded but never signed up in this test
  })

  test('a manager is FORBIDDEN from the admin surface', async () => {
    const res = await authed(managerCookie)('/api/v1/admin/users')
    expect(res.status).toBe(403)
  })

  test('invite-by-email creates the domain user; duplicates 409', async () => {
    const res = await authed(adminCookie)('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'newhire@zoomez.app', name: 'New Hire', role: 'staff' }),
    })
    expect(res.status).toBe(201)

    const dup = await authed(adminCookie)('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'newhire@zoomez.app', name: 'New Hire', role: 'staff' }),
    })
    expect(dup.status).toBe(409)

    // the invited email signs up → lands with the assigned role
    const cookie = await signIn('newhire@zoomez.app', 'New Hire')
    const me = await (await authed(cookie)('/api/v1/me')).json() as { role: string }
    expect(me.role).toBe('staff')
  })

  test('role change works and is reflected', async () => {
    const { items } = (await (await authed(adminCookie)('/api/v1/admin/users')).json()) as { items: Array<{ id: string; email: string }> }
    const hire = items.find((u) => u.email === 'newhire@zoomez.app')!
    const res = await authed(adminCookie)(`/api/v1/admin/users/${hire.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'manager' }),
    })
    expect(res.status).toBe(200)
    const after = (await res.json()) as { role: string }
    expect(after.role).toBe('manager')
  })

  test('the last admin cannot be demoted', async () => {
    const { items } = (await (await authed(adminCookie)('/api/v1/admin/users')).json()) as { items: Array<{ id: string; role: string }> }
    const admin = items.find((u) => u.role === 'admin')!
    const res = await authed(adminCookie)(`/api/v1/admin/users/${admin.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: 'manager' }),
    })
    expect(res.status).toBe(409)
  })
})
