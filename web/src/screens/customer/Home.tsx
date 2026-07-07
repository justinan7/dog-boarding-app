import { Icon } from '../../components/Icon'
import { Wordmark, Badge, Button } from '../../components/primitives'

function AccountChip({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 999,
        padding: '5px 12px 5px 5px',
      }}
    >
      <span
        style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={15} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

export function CustomerHome({ go }: { go: (r: 'book' | 'report-card' | 'stay' | 'pay' | 'messages') => void }) {
  const needsDeposit = true

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--lagoon-700)',
            }}
          >
            <Icon name="bell" size={18} />
          </div>
          <AccountChip name="Sarah" />
        </div>
      </div>

      {/* Greeting */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.05, color: 'var(--text-heading)' }}>
          Good morning, Sarah.
        </div>
        <div style={{ marginTop: 6, fontSize: 15, color: 'var(--text-muted)' }}>
          Biscuit checks in Friday at 9:00 AM.
        </div>
      </div>

      {/* Upcoming stay */}
      <div
        onClick={() => go('stay')}
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: 18,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 999,
              background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}
          >
            <Icon name="dog" size={24} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
              Biscuit's stay
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Beagle · Jul 4 – 6 · 2 nights</span>
          </div>
          <Badge tone="success">Approved</Badge>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Drop-off</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Friday, 9:00 AM</span>
        </div>
      </div>

      {/* Before check-in */}
      {needsDeposit && (
        <div
          style={{
            background: 'var(--surface-tint)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--lagoon-700)',
            }}
          >
            Before check-in
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>$40 deposit</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Holds Biscuit's suite</span>
            </div>
            <Button variant="primary" size="sm" onClick={() => go('pay')}>Pay now</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Boarding waiver</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Two minutes, one signature</span>
            </div>
            <Button variant="secondary" size="sm">Review</Button>
          </div>
        </div>
      )}

      {/* Latest report card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--stone-600)',
            }}
          >
            Latest report card
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>All cards</span>
        </div>
        <div
          onClick={() => go('report-card')}
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 64, height: 56, borderRadius: 'var(--radius-md)',
              background: 'var(--seaglass-100)', color: 'var(--lagoon-300)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}
          >
            <Icon name="sun" size={22} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Friday, 4:12 PM</span>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--text-heading)' }}>
              "Biscuit made a friend today."
            </span>
          </div>
          <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-400)' }} />
        </div>
      </div>

      <Button variant="gold" size="lg" fullWidth icon="calendar-days" onClick={() => go('book')}>
        Book a stay
      </Button>
    </>
  )
}
