import { Icon } from '../../components/Icon'
import { Badge, Button, DogAvatar } from '../../components/primitives'

function TimelineRow({
  label,
  detail,
  state,
  last,
}: {
  label: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
  last?: boolean
}) {
  const dot =
    state === 'upcoming'
      ? {
          width: 12,
          height: 12,
          borderRadius: 999,
          border: '2px solid var(--stone-200)',
          boxSizing: 'border-box' as const,
          background: 'var(--surface-card)',
        }
      : {
          width: 12,
          height: 12,
          borderRadius: 999,
          background: 'var(--lagoon-700)',
          boxShadow: state === 'current' ? '0 0 0 4px var(--seaglass-100)' : undefined,
        }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={dot} />
        {!last && (
          <span
            style={{
              width: 2,
              height: 26,
              background: state === 'done' ? 'var(--lagoon-700)' : 'var(--stone-200)',
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, marginTop: -3 }}>
        <span
          style={
            state === 'current'
              ? { fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }
              : { fontSize: 14, color: state === 'done' ? 'var(--text-body)' : 'var(--text-muted)' }
          }
        >
          {label}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail}</span>
      </div>
    </div>
  )
}

export function StayDetail({ go, onBack }: { go: (r: 'messages' | 'pay') => void; onBack: () => void }) {
  const needsDeposit = true
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <DogAvatar size={40} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>
              Biscuit's stay
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Jul 4 – 6 · 2 nights</span>
          </div>
        </div>
        <Badge tone="success">Approved</Badge>
      </div>

      {/* Timeline */}
      <div className="z-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <TimelineRow label="Requested" detail="Jun 28" state="done" />
        <TimelineRow label="Approved" detail="Jun 29" state="current" />
        <TimelineRow label="Check-in" detail="Fri, 9:00 AM" state="upcoming" />
        <TimelineRow label="In residence" detail="Daily report cards" state="upcoming" />
        <TimelineRow label="Check-out" detail="Sun, 5:00 PM" state="upcoming" last />
      </div>

      {/* Cost */}
      <div className="z-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--stone-600)',
          }}
        >
          Cost
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Boarding, 2 nights</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>$110</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Bath before pick-up</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>$25</span>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>$135</span>
        </div>
        {needsDeposit && (
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--biscuit-700)' }}>$40 deposit due now</span>
            <Button variant="gold" size="sm" onClick={() => go('pay')}>Pay deposit</Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="md" icon="message-circle" style={{ flex: 1 }} onClick={() => go('messages')}>
          Message us
        </Button>
        <Button variant="ghost" size="md" style={{ flex: 1 }}>Cancel stay</Button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Free cancellation until Wednesday, Jul 1.
      </div>
    </>
  )
}
