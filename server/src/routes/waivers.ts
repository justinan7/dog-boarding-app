import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { waiverTemplates, waiverSubmissions } from '../db/schema'
import { AppError } from '../lib/errors'
import { ownCustomerId } from '../lib/domain-user'
import { env } from '../env'
import { log } from '../lib/log'
import type { AppEnv } from '../lib/hono-env'

export const waiversRouter = new Hono<AppEnv>()

const docusealEnabled = () => !!env.DOCUSEAL_API_KEY

const signingBase = () =>
  env.DOCUSEAL_PUBLIC_URL ?? (env.PUBLIC_DOMAIN ? `https://sign.${env.PUBLIC_DOMAIN}` : env.DOCUSEAL_URL)

// GET /api/v1/waivers/mine — the signed-in customer's waiver state.
waiversRouter.get('/mine', async (c) => {
  const du = c.get('domainUser')
  if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const custId = await ownCustomerId(du)
  if (!custId) return c.json({ enabled: docusealEnabled(), items: [] })

  const db = getDb()
  const templates = await db.select().from(waiverTemplates)
  const items = await Promise.all(templates.map(async (t) => {
    const [sub] = await db.select().from(waiverSubmissions)
      .where(and(eq(waiverSubmissions.customerId, custId), eq(waiverSubmissions.templateId, t.id)))
      .orderBy(desc(waiverSubmissions.createdAt))
      .limit(1)
    return {
      templateId: t.id,
      name: t.name,
      version: t.version,
      status: sub?.status ?? 'missing',
      signedAt: sub?.signedAt ?? null,
    }
  }))

  return c.json({ enabled: docusealEnabled(), items })
})

// POST /api/v1/waivers/:templateId/sign — create a DocuSeal submission for the
// signed-in customer and hand back the hosted signing URL. The webhook flips
// the row to `signed` when they complete it.
waiversRouter.post('/:templateId/sign', async (c) => {
  const du = c.get('domainUser')
  if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (!docusealEnabled()) throw new AppError('CONFLICT', 'E-signature is not configured yet')
  const custId = await ownCustomerId(du)
  if (!custId) throw new AppError('FORBIDDEN', 'Customer record not found')

  const db = getDb()
  const [template] = await db.select().from(waiverTemplates)
    .where(eq(waiverTemplates.id, c.req.param('templateId'))).limit(1)
  if (!template) throw new AppError('NOT_FOUND', 'Waiver template not found')
  if (!template.docusealTemplateId) throw new AppError('CONFLICT', 'Template has no DocuSeal document attached yet')

  // Create the DocuSeal submission (no email — the PWA opens the link).
  const res = await fetch(`${env.DOCUSEAL_URL}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': env.DOCUSEAL_API_KEY! },
    body: JSON.stringify({
      template_id: Number(template.docusealTemplateId),
      send_email: false,
      submitters: [{ email: du.email, name: du.displayName, role: 'First Party' }],
    }),
  })
  if (!res.ok) {
    log.error({ status: res.status, body: await res.text() }, 'docuseal submission create failed')
    throw new AppError('INTERNAL', 'Could not start the signing session')
  }
  const submitters = (await res.json()) as Array<{ submission_id: number; slug: string }>
  const first = submitters[0]
  if (!first) throw new AppError('INTERNAL', 'DocuSeal returned no submitters')

  await db.insert(waiverSubmissions).values({
    customerId: custId,
    templateId: template.id,
    templateVersion: template.version,
    status: 'missing', // stays missing until the webhook confirms completion
    docusealSubmissionId: String(first.submission_id),
  })

  return c.json({ url: `${signingBase()}/s/${first.slug}` }, 201)
})

// POST /api/v1/webhooks/docuseal — DocuSeal calls this on form.completed.
// No session auth (server-to-server); guarded by a shared secret in the query.
export const docusealWebhook = new Hono<AppEnv>()
docusealWebhook.post('/', async (c) => {
  if (env.DOCUSEAL_WEBHOOK_SECRET && c.req.query('secret') !== env.DOCUSEAL_WEBHOOK_SECRET) {
    throw new AppError('UNAUTHORIZED', 'Bad webhook secret')
  }
  const payload = (await c.req.json()) as {
    event_type?: string
    data?: { submission_id?: number; submission?: { id?: number }; id?: number }
  }
  if (payload.event_type !== 'form.completed') return c.json({ ok: true })

  const submissionId = payload.data?.submission_id ?? payload.data?.submission?.id ?? payload.data?.id
  if (!submissionId) return c.json({ ok: true })

  const db = getDb()
  const [updated] = await db.update(waiverSubmissions)
    .set({ status: 'signed', signedAt: new Date(), certificate: payload as never })
    .where(eq(waiverSubmissions.docusealSubmissionId, String(submissionId)))
    .returning()
  log.info({ submissionId, matched: !!updated }, 'docuseal form.completed webhook')
  return c.json({ ok: true })
})
