import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Section } from '../../components/primitives'
import { useReservations, useInvoice, useAddons } from '../../lib/queries'
import { activeStays, petLine } from '../../lib/stays'
import { fmtDateRange, fmtDollars, nightsBetween } from '../../lib/format'

function Radio({ checked, onSelect }: { checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      style={{
        width: 20,
        height: 20,
        flex: 'none',
        cursor: 'pointer',
        borderRadius: 999,
        padding: 0,
        background: 'var(--surface-card)',
        border: checked ? '6px solid var(--lagoon-700)' : '2px solid var(--stone-400)',
        transition: 'border var(--dur-fast) var(--ease-out)',
      }}
    />
  )
}

function LineItem({ label, amount, tone }: { label: string; amount: string; tone?: 'success' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: tone === 'success' ? 'var(--green-success)' : 'var(--text-heading)' }}>
        {amount}
      </span>
    </div>
  )
}

export function Payment({ stayId, onBack }: { stayId: string | null; onBack: () => void }) {
  const reservations = useReservations()
  const stay = (reservations.data?.items ?? []).find((r) => r.id === stayId)
    ?? activeStays(reservations.data?.items)[0]
  const invoiceQ = useInvoice(stay?.id ?? null)
  const addonsQ = useAddons()

  const [added, setAdded] = useState<string[]>([])
  const [method, setMethod] = useState<'card' | 'new'>('card')
  const [stripeNote, setStripeNote] = useState(false)

  const invoice = invoiceQ.data?.invoice
  const lineItems = invoiceQ.data?.lineItems ?? []

  // Extras = catalog items not already on the invoice.
  const onInvoice = new Set(lineItems.map((li) => li.label))
  const extras = (addonsQ.data?.items ?? []).filter((a) => !onInvoice.has(a.label))
  const nights = stay ? Math.max(nightsBetween(stay.startDate, stay.endDate), 1) : 1

  const toggle = (id: string) =>
    setAdded((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))

  const extraCents = extras
    .filter((e) => added.includes(e.id))
    .reduce((s, e) => s + e.priceCents * (e.per === 'day' ? nights : 1), 0)
  const balanceCents = (invoice?.balanceCents ?? 0) + extraCents

  if (!stay) {
    return (
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {reservations.isLoading ? 'Loading…' : 'No stay found.'}
      </div>
    )
  }

  return (
    <>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>Payment</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {petLine(stay.petNames)} · {fmtDateRange(stay.startDate, stay.endDate)}
            {invoice ? ` · Invoice ${invoice.id.slice(0, 4).toUpperCase()}` : ''}
          </span>
        </div>
      </div>

      {/* Invoice summary */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {lineItems.map((li) => (
          <LineItem key={li.id} label={li.label} amount={fmtDollars(li.qty * li.unitCents)} />
        ))}
        {extras.filter((e) => added.includes(e.id)).map((e) => (
          <LineItem
            key={e.id}
            label={e.label}
            amount={fmtDollars(e.priceCents * (e.per === 'day' ? nights : 1))}
          />
        ))}
        {invoice && invoice.depositPaidCents > 0 && (
          <LineItem label="Deposit, paid" amount={`− ${fmtDollars(invoice.depositPaidCents)}`} tone="success" />
        )}
        {!invoice && !invoiceQ.isLoading && (
          <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            No invoice yet — it's created when the stay is approved.
          </span>
        )}
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Balance due</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>
            {fmtDollars(balanceCents)}
          </span>
        </div>
      </div>

      {/* Upsells */}
      {extras.length > 0 && (
        <Section label="A little something extra" labelColor="var(--accent-gold)">
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              padding: '4px 16px',
            }}
          >
            {extras.map((e, i) => {
              const isAdded = added.includes(e.id)
              return (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: i < extras.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>{e.label}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {e.per === 'day' ? 'Daily, the whole stay' : 'Once, this stay'}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" icon={isAdded ? 'check' : 'plus'} onClick={() => toggle(e.id)}>
                    ${e.priceCents / 100}
                  </Button>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Pay with */}
      <Section label="Pay with">
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '4px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <Radio checked={method === 'card'} onSelect={() => setMethod('card')} />
            <Icon name="credit-card" size={18} style={{ color: 'var(--stone-600)' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>Card</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <Radio checked={method === 'new'} onSelect={() => setMethod('new')} />
            <span style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>Add a card</span>
          </div>
        </div>
      </Section>

      {stripeNote && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)',
            padding: '11px 14px', fontSize: 13, color: 'var(--biscuit-700)',
          }}
        >
          <Icon name="info" size={16} style={{ marginTop: 1, flex: 'none' }} />
          <span>Card payments launch with the Stripe account — in this demo build the invoice is view-only.</span>
        </div>
      )}
      <Button variant="gold" size="lg" fullWidth onClick={() => setStripeNote(true)}>
        Pay {fmtDollars(balanceCents)}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        A receipt will be emailed to you.
      </div>
    </>
  )
}
