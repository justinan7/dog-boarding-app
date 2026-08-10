import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import crypto from 'node:crypto'
import { createApp } from '../src/app'
import { initDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { lastEmail } from '../src/lib/email'

let app: Awaited<ReturnType<typeof createApp>>

const H = { 'Content-Type': 'application/json' }
function jar(cookie: string) {
  return {
    async post(path: string, body: unknown) {
      const res = await app.request(path, { method: 'POST', headers: { ...H, Cookie: cookie }, body: JSON.stringify(body) })
      const set = res.headers.get('set-cookie')
      if (set) cookie = set.split(',').map((c) => c.split(';')[0]).join('; ')
      return res
    },
    async get(path: string) {
      return app.request(path, { headers: { Cookie: cookie } })
    },
    get cookie() { return cookie },
  }
}

// TOTP (RFC 6238) — matches an authenticator app for the 2FA test.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32decode(s: string): Buffer {
  s = s.replace(/=+$/, '').toUpperCase()
  let bits = ''
  for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}
function totp(secret: string): string {
  const key = b32decode(secret)
  const counter = Math.floor(Date.now() / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', key).update(buf).digest()
  const o = h[h.length - 1]! & 0xf
  const n = ((h[o]! & 0x7f) << 24) | ((h[o + 1]! & 0xff) << 16) | ((h[o + 2]! & 0xff) << 8) | (h[o + 3]! & 0xff)
  return (n % 1_000_000).toString().padStart(6, '0')
}

beforeAll(async () => {
  await initDb('pglite://memory')
  await runMigrations()
  await seed()
  app = await createApp()
})
afterAll(async () => { await resetDb() })

describe('password reset (log-driver round trip)', () => {
  test('request → email link → reset → old password stops working', async () => {
    const u = jar('')
    await u.post('/api/auth/sign-up/email', { email: 'pwreset@example.com', password: 'Original1!', name: 'PW Reset' })

    const reqRes = await u.post('/api/auth/request-password-reset', { email: 'pwreset@example.com' })
    expect(reqRes.status).toBe(200)

    // grab the token from the captured email
    const link = lastEmail?.text.match(/\?reset=([A-Za-z0-9_-]+)/)
    expect(link).toBeTruthy()
    const token = link![1]!

    const resetRes = await u.post('/api/auth/reset-password', { token, newPassword: 'BrandNew9!' })
    expect(resetRes.status).toBe(200)

    const newOk = await u.post('/api/auth/sign-in/email', { email: 'pwreset@example.com', password: 'BrandNew9!' })
    expect(newOk.status).toBe(200)
    const oldFail = await u.post('/api/auth/sign-in/email', { email: 'pwreset@example.com', password: 'Original1!' })
    expect(oldFail.status).toBe(401)
  })

  test('a bad reset token is rejected', async () => {
    const u = jar('')
    const res = await u.post('/api/auth/reset-password', { token: 'not-a-real-token', newPassword: 'Whatever9!' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('TOTP two-factor', () => {
  test('enroll, then sign-in requires the code', async () => {
    const u = jar('')
    await u.post('/api/auth/sign-up/email', { email: '2fa@zoomez.app', password: 'Secret123!', name: '2FA User' })

    const enable = await u.post('/api/auth/two-factor/enable', { password: 'Secret123!' })
    expect(enable.status).toBe(200)
    const { totpURI, backupCodes } = (await enable.json()) as { totpURI: string; backupCodes: string[] }
    const secret = new URL(totpURI).searchParams.get('secret')!
    expect(secret).toBeTruthy()
    expect(backupCodes.length).toBeGreaterThan(0)

    const confirm = await u.post('/api/auth/two-factor/verify-totp', { code: totp(secret) })
    expect(confirm.status).toBe(200)

    // fresh session: password alone yields a challenge, not a session
    const anon = jar('')
    const signin = await anon.post('/api/auth/sign-in/email', { email: '2fa@zoomez.app', password: 'Secret123!' })
    const body = (await signin.json()) as { twoFactorRedirect?: boolean }
    expect(body.twoFactorRedirect).toBe(true)

    // wrong code rejected
    const bad = await anon.post('/api/auth/two-factor/verify-totp', { code: '000000' })
    expect(bad.status).toBeGreaterThanOrEqual(400)

    // correct code completes the login
    const good = await anon.post('/api/auth/two-factor/verify-totp', { code: totp(secret) })
    expect(good.status).toBe(200)
    const me = await (await anon.get('/api/v1/me')).json() as { email: string; twoFactorEnabled: boolean }
    expect(me.email).toBe('2fa@zoomez.app')
    expect(me.twoFactorEnabled).toBe(true)
  })
})
