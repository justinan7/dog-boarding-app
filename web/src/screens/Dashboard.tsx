import { Icon } from '../components/Icon'
import { Wordmark, Section, Card, Button, Chip, DogAvatar } from '../components/primitives'

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
        padding: '4px 11px 4px 4px',
      }}
    >
      <span
        style={{
          width: 26, height: 26, borderRadius: 999,
          background: 'var(--biscuit-300)', color: 'var(--biscuit-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={14} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={13} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

function LiveRow({ title, time, who }: { title: string; time: string; who: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <DogAvatar size={30} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{time}</span>
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{who}</span>
    </div>
  )
}

const RESIDENTS: { name: string; alert?: boolean }[] = [
  { name: 'Biscuit' }, { name: 'Bella' }, { name: 'Cooper?', alert: true },
  { name: 'Luna' }, { name: 'Max' }, { name: 'Rocky' },
]

export function Dashboard() {
  return (
    <>
      {/* Header */}
      <div className="z-row-btwn" style={{ gap: 8 }}>
        <Wordmark size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--surface-tint)', color: 'var(--lagoon-700)',
              borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 600,
            }}
          >
            6 / 8 suites
          </span>
          <AccountChip name="Corry" />
        </div>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, color: 'var(--text-heading)' }}>
          Wednesday, Jul 3
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          On shift: Jack Torres · 7a – 3p
        </div>
      </div>

      {/* Approval-count pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chip tone="gold">2 bookings</Chip>
        <Chip tone="gold">1 shift claim</Chip>
        <Chip tone="gold">2 messages</Chip>
      </div>

      {/* Overdue */}
      <Section label="Overdue" labelColor="var(--red-error)">
        <Card accent="coral" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DogAvatar size={40} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Bella · Insulin 4u</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Due 2:00 PM · assigned to Jack</span>
            </div>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--coral-500)', color: 'var(--foam-50)',
                borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700,
              }}
            >
              +38m
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="sm" style={{ flex: 1 }}>Ping Jack</Button>
            <Button variant="secondary" size="sm" style={{ flex: 1 }}>Reassign</Button>
          </div>
        </Card>
      </Section>

      {/* Live board */}
      <Section label="Live board">
        <Card style={{ padding: '4px 16px' }}>
          <LiveRow title="Biscuit · Rimadyl 75 mg" time="4:00 PM" who="Jack" />
          <LiveRow title="Cooper · Dinner 1.5 cup" time="4:00 PM" who="Jack" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' }}>
            <DogAvatar size={30} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, color: 'var(--text-body)' }}>Bella · Dinner + insulin</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>6:30 PM</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Jack</span>
          </div>
        </Card>
      </Section>

      {/* In residence */}
      <Section label="In residence">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {RESIDENTS.map((r) => (
            <Chip
              key={r.name}
              tone={r.alert ? 'coral' : 'lagoon'}
              leading={<DogAvatar size={22} tone={r.alert ? 'coral' : 'seaglass'} />}
            >
              {r.name}
            </Chip>
          ))}
        </div>
      </Section>
    </>
  )
}
