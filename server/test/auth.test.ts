import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'

let app: Awaited<ReturnType<typeof createApp>>

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()
})
afterAll(async () => {
  await resetDb()
})

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>
}

// Helper: sign up a new user via Better Auth's email+password flow.
async function signUp(email: string, password: string, name: string) {
  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return res
}

// Helper: sign in and return the session cookie string.
async function signIn(email: string, password: string): Promise<{ cookie: string; bearerToken: string | null }> {
  const res = await app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.status).toBe(200)
  const cookie = res.headers.get('set-cookie') ?? ''
  const bearerToken = res.headers.get('set-auth-token')
  return { cookie, bearerToken }
}

describe('email + password sign-up and sign-in', () => {
  test('sign up creates a user', async () => {
    const res = await signUp('testuser@example.com', 'SecureP@ss123', 'Test User')
    expect(res.status).toBe(200)
    const body = await json(res)
    // Better Auth v1.6 returns { user, … } on sign-up; session may be in a
    // cookie or a separate key depending on the plugin config.
    expect(body).toHaveProperty('user')
  })

  test('sign in returns a cookie + bearer token (set-auth-token header)', async () => {
    const { cookie, bearerToken } = await signIn('testuser@example.com', 'SecureP@ss123')
    expect(cookie).toContain('better-auth.session_token')
    // Bearer plugin with requireSignature: true emits set-auth-token
    expect(bearerToken).toBeTruthy()
  })
})

describe('GET /api/v1/me', () => {
  test('unauthenticated request returns 401', async () => {
    const res = await app.request('/api/v1/me')
    expect(res.status).toBe(401)
    const body = await json(res)
    expect(body.error).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  test('authenticated request returns the user profile', async () => {
    const { cookie } = await signIn('testuser@example.com', 'SecureP@ss123')
    const res = await app.request('/api/v1/me', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await json(res) as {
      email: string; name: string; role: string; managerElevatedUntil: string | null
    }
    expect(body.email).toBe('testuser@example.com')
    expect(body.name).toBe('Test User')
    // New user not in the domain users table yet → default role
    expect(body.role).toBe('customer')
    expect(body.managerElevatedUntil).toBeNull()
  })

  test('bearer token auth works for the same endpoint', async () => {
    const { bearerToken } = await signIn('testuser@example.com', 'SecureP@ss123')
    const res = await app.request('/api/v1/me', {
      headers: { Authorization: `Bearer ${bearerToken}` },
    })
    expect(res.status).toBe(200)
    const body = await json(res) as { email: string }
    expect(body.email).toBe('testuser@example.com')
  })
})

describe('manager PIN elevation (§2.3)', () => {
  let cookie: string

  beforeAll(async () => {
    const result = await signIn('testuser@example.com', 'SecureP@ss123')
    cookie = result.cookie
  })

  test('wrong PIN returns 403', async () => {
    const res = await app.request('/api/v1/me/elevate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ pin: '0000' }),
    })
    expect(res.status).toBe(403)
  })

  test('correct PIN returns 204 and sets managerElevatedUntil on /me', async () => {
    const res = await app.request('/api/v1/me/elevate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ pin: '1234' }),
    })
    expect(res.status).toBe(204)

    const meRes = await app.request('/api/v1/me', { headers: { Cookie: cookie } })
    const body = await json(meRes) as { managerElevatedUntil: string | null }
    expect(body.managerElevatedUntil).toBeTruthy()
    const expiresAt = new Date(body.managerElevatedUntil!).getTime()
    expect(expiresAt).toBeGreaterThan(Date.now())
  })

  test('de-elevate clears the elevation', async () => {
    const res = await app.request('/api/v1/me/de-elevate', {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(204)

    const meRes = await app.request('/api/v1/me', { headers: { Cookie: cookie } })
    const body = await json(meRes) as { managerElevatedUntil: string | null }
    expect(body.managerElevatedUntil).toBeNull()
  })
})
