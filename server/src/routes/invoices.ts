import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { invoices, invoiceLineItems, reservations } from '../db/schema'
import { AppError } from '../lib/errors'
import { ownCustomerId } from '../lib/domain-user'
import type { AppEnv } from '../lib/hono-env'

export const invoicesRouter = new Hono<AppEnv>()

// GET /api/v1/invoices?reservationId= — the invoice + line items for a stay.
// Read-only for now: payment capture is Stripe (B10, pending account setup),
// so the PWA renders the invoice and stubs the pay action.
invoicesRouter.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  const db = getDb()

  const reservationId = c.req.query('reservationId')
  if (!reservationId) throw new AppError('VALIDATION', 'reservationId is required')

  // Customers may only read invoices for their own reservations.
  const du = c.get('domainUser')
  if (du?.role === 'customer') {
    const custId = await ownCustomerId(du)
    const [res] = await db.select({ customerId: reservations.customerId })
      .from(reservations).where(eq(reservations.id, reservationId)).limit(1)
    if (!res || !custId || res.customerId !== custId) {
      throw new AppError('NOT_FOUND', 'Invoice not found')
    }
  }

  const [invoice] = await db.select().from(invoices)
    .where(eq(invoices.reservationId, reservationId)).limit(1)
  if (!invoice) return c.json({ invoice: null, lineItems: [] })

  const lineItems = await db.select().from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoice.id))

  return c.json({ invoice, lineItems })
})
