import { Icon } from '../../components/Icon'
import { Eyebrow, Card, Button, Badge, DogAvatar } from '../../components/primitives'

function RoundBtn({ icon }: { icon: 'chevron-left' | 'chevron-right' }) {
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: 999,
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-700)',
      }}
    >
      <Icon name={icon} size={17} />
    </div>
  )
}

const DAYS: { label: string; count: number; full?: boolean }[] = [
  { label: 'Th 3', count: 6 },
  { label: 'Fr 4', count: 8, full: true },
  { label: 'Sa 5', count: 8, full: true },
  { label: 'Su 6', count: 5 },
  { label: 'Mo 7', count: 4 },
  { label: 'Tu 8', count: 3 },
]

export function Calendar() {
  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>July 2026</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Capacity: 8 suites / night</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <RoundBtn icon="chevron-left" />
          <RoundBtn icon="chevron-right" />
        </div>
      </div>

      {/* Capacity strip */}
      <Card style={{ padding: '14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, textAlign: 'center' }}>
          {DAYS.map((d) => (
            <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: d.full ? 'var(--red-error)' : 'var(--text-heading)' }}>{d.count}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: d.full ? 'var(--red-error)' : 'var(--green-success)' }}>
                {d.full ? 'FULL' : 'OK'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Eyebrow>Pending requests · 2</Eyebrow>

      {/* Rocky — overlaps full nights */}
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DogAvatar size={40} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Rocky · Lab</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Diaz · Jul 4 → 6</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            background: 'var(--coral-200)', borderRadius: 'var(--radius-md)',
            padding: '9px 12px', fontSize: 12.5, color: '#A94E33',
          }}
        >
          <Icon name="triangle-alert" size={15} style={{ marginTop: 1, flex: 'none' }} />
          <span>Overlaps FULL nights Jul 4 and 5.</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Waiver signed · $50 deposit held · “Intact male, crate-trained.”
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" style={{ flex: 1 }}>Deny</Button>
          <Button variant="secondary" size="sm" style={{ flex: 1 }}>Waitlist</Button>
          <Button variant="primary" size="sm" style={{ flex: 1.3 }}>Approve</Button>
        </div>
      </Card>

      {/* Luna — waiver not signed, approve gated */}
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DogAvatar size={40} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Luna · Poodle</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Kim · Jul 9 → 12</span>
          </div>
          <Badge tone="success">Space OK</Badge>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--red-error)', fontWeight: 600 }}>Waiver not signed · no deposit</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" style={{ flex: 1 }}>Deny</Button>
          <Button variant="secondary" size="sm" style={{ flex: 1.4 }}>Request waiver</Button>
          <Button variant="primary" size="sm" style={{ flex: 1 }} disabled>Approve</Button>
        </div>
      </Card>
    </>
  )
}
