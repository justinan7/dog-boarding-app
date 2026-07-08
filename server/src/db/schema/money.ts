import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt, updatedAt } from './_shared'
import { organizations } from './identity'
import { reservations } from './booking'
import {
  invoiceStatusEnum, lineItemKindEnum, addonPerEnum,
  paymentProviderEnum, paymentKindEnum, paymentStatusEnum,
} from './enums'

// Upsell catalog (bath, extra walk, nail trim…). A purchased add-on adds a line
// item and can spawn a staff care_task.
export const addonCatalogItems = pgTable('addon_catalog_items', {
  id: pk(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  label: text('label').notNull(),
  priceCents: integer('price_cents').notNull(),
  per: addonPerEnum('per').notNull().default('stay'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
})

export const invoices = pgTable('invoices', {
  id: pk(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  depositPaidCents: integer('deposit_paid_cents').notNull().default(0),
  balanceCents: integer('balance_cents').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('invoices_reservation_idx').on(t.reservationId)])

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: pk(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  kind: lineItemKindEnum('kind').notNull(),
  label: text('label').notNull(),
  qty: integer('qty').notNull().default(1),
  unitCents: integer('unit_cents').notNull(),
  addonCatalogItemId: uuid('addon_catalog_item_id').references(() => addonCatalogItems.id),
}, (t) => [index('line_items_invoice_idx').on(t.invoiceId)])

// PSP-neutral. `provider` + wrapper keep the schema portable off Stripe.
export const payments = pgTable('payments', {
  id: pk(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  provider: paymentProviderEnum('provider').notNull().default('stripe'),
  providerRef: text('provider_ref'), // e.g. Stripe PaymentIntent / Checkout Session id
  kind: paymentKindEnum('kind').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: createdAt(),
}, (t) => [index('payments_invoice_idx').on(t.invoiceId)])

// De-duped webhook log — unique on (provider, event id) makes replays no-ops
// and lets out-of-order handling compare timestamps (invariant 6).
export const paymentEvents = pgTable('payment_events', {
  id: pk(),
  provider: paymentProviderEnum('provider').notNull().default('stripe'),
  providerEventId: text('provider_event_id').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('payment_events_provider_event_uq').on(t.provider, t.providerEventId)])
