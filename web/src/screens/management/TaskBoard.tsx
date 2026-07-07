import { Icon } from '../../components/Icon'
import { Section, Card, Button, Badge, DogAvatar } from '../../components/primitives'

function UpcomingRow({ time, task, last }: { time: string; task: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: last ? undefined : '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lagoon-700)', width: 52 }}>{time}</span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--text-body)' }}>{task}</span>
    </div>
  )
}

export function TaskBoard() {
  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>Task board</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Wed Jul 3 · on shift Jack T, 7a – 3p</span>
        </div>
        <Badge tone="lagoon">7 / 11 done</Badge>
      </div>

      {/* Overdue */}
      <Section label="Overdue" labelColor="var(--red-error)">
        <Card accent="coral" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DogAvatar size={38} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Bella · Insulin 4u</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Due 2:00 PM · assigned Jack</span>
            </div>
            <span style={{ background: 'var(--coral-500)', color: 'var(--foam-50)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700 }}>
              +38m
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" style={{ flex: 1 }}>Ping</Button>
            <Button variant="secondary" size="sm" style={{ flex: 1 }}>Reassign</Button>
            <Button variant="ghost" size="sm" style={{ flex: 1 }}>Mark done*</Button>
          </div>
        </Card>
      </Section>

      {/* Upcoming */}
      <Section label="Upcoming">
        <Card style={{ padding: '4px 16px' }}>
          <UpcomingRow time="4:00p" task="Biscuit · Rimadyl w/ food" />
          <UpcomingRow time="4:00p" task="Cooper · dinner 1.5 cup" />
          <UpcomingRow time="6:30p" task="Bella · dinner + insulin 4u" />
          <UpcomingRow time="8:00p" task="Rocky · walk 15 min" last />
        </Card>
      </Section>

      {/* Done today */}
      <Section label="Done today">
        <Card style={{ padding: '4px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <Icon name="check" size={16} style={{ color: 'var(--green-success)', marginTop: 2, flex: 'none' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, color: 'var(--text-body)' }}>Biscuit · Rimadyl · 8:00a</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jack · “took w/ peanut butter, ate fine” · +photo</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' }}>
            <Icon name="check" size={16} style={{ color: 'var(--green-success)', flex: 'none' }} />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-body)' }}>Bella · Insulin 4u · 8:00a</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jack</span>
          </div>
        </Card>
      </Section>

      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
        * A management override is flagged and written to the audit log.
      </div>
    </>
  )
}
