import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Section } from '../../components/primitives'

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

const EXTRAS: { id: string; title: string; sub: string; price: number }[] = [
  { id: 'play', title: 'Extra play session', sub: 'Daily, one-on-one', price: 10 },
  { id: 'nails', title: 'Nail trim', sub: 'Before pick-up', price: 15 },
  { id: 'album', title: 'Printed photo album', sub: 'The whole stay, in golden hour', price: 20 },
]

const BASE_BALANCE = 95

export function Payment({ onBack }: { onBack: () => void }) {
  const [added, setAdded] = useState<string[]>([])
  const [method, setMethod] = useState<'visa' | 'new'>('visa')
  const [pressed, setPressed] = useState(false)

  const toggle = (id: string) =>
    setAdded((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))

  const balance = BASE_BALANCE + EXTRAS.filter((e) => added.includes(e.id)).reduce((s, e) => s + e.price, 0)

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
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Biscuit · Jul 4 – 6 · Invoice 1042</span>
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
        <LineItem label="Boarding, 2 nights" amount="$110" />
        <LineItem label="Bath before pick-up" amount="$25" />
        {EXTRAS.filter((e) => added.includes(e.id)).map((e) => (
          <LineItem key={e.id} label={e.title} amount={`$${e.price}`} />
        ))}
        <LineItem label="Deposit, paid Jun 29" amount="− $40" tone="success" />
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Balance due</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>${balance}</span>
        </div>
      </div>

      {/* Upsells */}
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
          {EXTRAS.map((e, i) => {
            const isAdded = added.includes(e.id)
            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 0',
                  borderBottom: i < EXTRAS.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>{e.title}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{e.sub}</span>
                </div>
                <Button variant="ghost" size="sm" icon={isAdded ? 'check' : 'plus'} onClick={() => toggle(e.id)}>
                  ${e.price}
                </Button>
              </div>
            )
          })}
        </div>
      </Section>

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
            <Radio checked={method === 'visa'} onSelect={() => setMethod('visa')} />
            <Icon name="credit-card" size={18} style={{ color: 'var(--stone-600)' }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>Visa ···· 4242</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <Radio checked={method === 'new'} onSelect={() => setMethod('new')} />
            <span style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>Add a card</span>
          </div>
        </div>
      </Section>

      <Button variant="gold" size="lg" fullWidth onClick={() => setPressed(true)}>
        {pressed ? `Paying $${balance}…` : `Pay $${balance}`}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        A receipt will be emailed to you.
      </div>
    </>
  )
}
