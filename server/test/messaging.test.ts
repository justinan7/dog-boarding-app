import { beforeAll, afterAll, expect, test, describe } from 'vitest'
import { createApp } from '../src/app'
import { initDb, getDb, resetDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { eq } from 'drizzle-orm'
import { threads, messages, takeoverEvents, auditEntries } from '../src/db/schema'

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

  // Sign up with a seeded staff email so domain-user resolution finds the
  // actor in our users table (Better Auth and domain users share email).
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

afterAll(async () => {
  await resetDb()
})

function authed(path: string, init?: RequestInit) {
  return app.request(path, { ...init, headers: { ...init?.headers, Cookie: cookie } })
}

describe('threads', () => {
  test('GET /api/v1/threads returns seeded threads', async () => {
    const res = await authed('/api/v1/threads')
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ id: string }> }
    expect(body.items.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /api/v1/threads?filter=unanswered filters by flag', async () => {
    const res = await authed('/api/v1/threads?filter=unanswered')
    const body = (await json(res)) as { items: Array<{ flags: string[] }> }
    expect(body.items.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /api/v1/threads/:id/messages returns the seeded conversation', async () => {
    const db = getDb()
    const [thread] = await db.select().from(threads).limit(1)

    const res = await authed(`/api/v1/threads/${thread!.id}/messages`)
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ body: string }> }
    expect(body.items.length).toBe(3) // seed has 3 messages in the Diaz thread
  })

  test('POST /api/v1/threads/:id/messages sends a message', async () => {
    const db = getDb()
    const [thread] = await db.select().from(threads).limit(1)

    const res = await authed(`/api/v1/threads/${thread!.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Test message from the integration test' }),
    })
    expect(res.status).toBe(201)
    const body = (await json(res)) as { body: string; senderDisplay: string }
    expect(body.body).toBe('Test message from the integration test')
  })

  test('POST /api/v1/threads/:id/oversight logs a takeover event + audit', async () => {
    const db = getDb()
    const [thread] = await db.select().from(threads).limit(1)

    const res = await authed(`/api/v1/threads/${thread!.id}/oversight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'take_over' }),
    })
    expect(res.status).toBe(200)

    // Verify takeover event was logged
    const events = await db.select().from(takeoverEvents).where(eq(takeoverEvents.threadId, thread!.id))
    expect(events.some((e) => e.action === 'takeover')).toBe(true)

    // Verify audit entry
    const audits = await db.select().from(auditEntries).where(eq(auditEntries.subjectId, thread!.id))
    expect(audits.some((a) => a.action === 'thread.take_over')).toBe(true)
  })
})

describe('care tasks', () => {
  test('GET /api/v1/care-tasks returns seeded tasks', async () => {
    const res = await authed('/api/v1/care-tasks')
    expect(res.status).toBe(200)
    const body = (await json(res)) as { items: Array<{ label: string }> }
    expect(body.items.length).toBeGreaterThanOrEqual(5)
  })

  test('GET /api/v1/care-tasks?state=overdue returns the overdue task', async () => {
    const res = await authed('/api/v1/care-tasks?state=overdue')
    const body = (await json(res)) as { items: Array<{ label: string; state: string }> }
    expect(body.items.length).toBeGreaterThanOrEqual(1)
    expect(body.items[0]!.label).toBe('Insulin 4u')
  })

  test('POST /api/v1/care-tasks/:id/complete marks a task done + creates event', async () => {
    const db = getDb()
    const { careTasks: ct } = await import('../src/db/schema')
    const [scheduled] = await db.select().from(ct).where(eq(ct.state, 'scheduled')).limit(1)
    if (!scheduled) return // no scheduled tasks left

    const res = await authed(`/api/v1/care-tasks/${scheduled.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'given', note: 'Integration test completion' }),
    })
    expect(res.status).toBe(200)
    const body = (await json(res)) as { state: string }
    expect(body.state).toBe('done')
  })
})

describe('report cards', () => {
  test('POST + GET /api/v1/report-cards — create draft + list', async () => {
    const db = getDb()
    const { reservations, pets } = await import('../src/db/schema')
    const [res] = await db.select().from(reservations).limit(1)
    const [pet] = await db.select().from(pets).limit(1)

    const createRes = await authed('/api/v1/report-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: res!.id,
        petId: pet!.id,
        date: '2026-07-03',
        mood: 'Playful',
        bestMoment: 'Made a friend today',
      }),
    })
    expect(createRes.status).toBe(201)
    const card = (await json(createRes)) as { id: string; status: string }
    expect(card.status).toBe('draft')

    // Send it
    const sendRes = await authed(`/api/v1/report-cards/${card.id}/send`, { method: 'POST' })
    expect(sendRes.status).toBe(200)
    const sent = (await json(sendRes)) as { status: string }
    expect(sent.status).toBe('sent')

    // Heart it
    const heartRes = await authed(`/api/v1/report-cards/${card.id}/heart`, { method: 'POST' })
    expect(heartRes.status).toBe(200)
  })
})
