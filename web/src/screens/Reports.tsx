import { Icon } from '../components/Icon'
import { Section, Card, Button, Badge, Eyebrow } from '../components/primitives'

const BARS: { h: number; peak?: boolean }[] = [
  { h: 40 }, { h: 55 }, { h: 100, peak: true }, { h: 100, peak: true },
  { h: 62 }, { h: 50 }, { h: 38 }, { h: 45 },
]

function StaffRow({
  name, stats, badge, avatarBg, avatarFg, last,
}: {
  name: string; stats: string; badge: string; avatarBg: string; avatarFg: string; last?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: last ? undefined : '1px solid var(--border-subtle)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 999, background: avatarBg, color: avatarFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name="user-round" size={15} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats}</span>
      </div>
      <Badge tone="success">{badge}</Badge>
    </div>
  )
}

function AuditRow({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
      <span style={{ color: 'var(--seaglass-200)', width: 44, flex: 'none' }}>{time}</span>
      <span style={{ color: 'var(--foam-50)' }}>{children}</span>
    </div>
  )
}

export function Reports() {
  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Reports</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
          July 2026
          <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
        </div>
      </div>

      {/* Occupancy */}
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Eyebrow>Occupancy</Eyebrow>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>avg 74% · peak Jul 4 – 5</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
          {BARS.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${b.h}%`,
                background: b.peak ? 'var(--lagoon-500)' : 'var(--seaglass-200)',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ))}
        </div>
      </Card>

      {/* Revenue */}
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Eyebrow>Revenue · July</Eyebrow>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Boarding</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>$3,540</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--text-muted)' }}>Upsells</span>
          <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>$640</span>
        </div>
        <div className="z-divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>$4,180</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 13px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--biscuit-700)' }}>$560 outstanding · 3 invoices</span>
          <Button variant="gold" size="sm">Chase</Button>
        </div>
      </Card>

      {/* Per-staff on-time */}
      <Card style={{ padding: '4px 16px' }}>
        <StaffRow name="Jack" stats="14 shifts · 46 tasks" badge="98% on time" avatarBg="var(--tide-300)" avatarFg="var(--tide-700)" />
        <StaffRow name="Maria" stats="11 shifts · 33 tasks" badge="100%" avatarBg="var(--biscuit-300)" avatarFg="var(--biscuit-700)" last />
      </Card>

      {/* Audit log */}
      <Section label="Audit log">
        <div style={{ background: 'var(--surface-inverse)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AuditRow time="2:48p"><b>Corry</b> approved booking · Rocky Jul 4 – 6</AuditRow>
          <AuditRow time="2:41p"><b>Brette</b> took over thread · Diaz &amp; Jack</AuditRow>
          <AuditRow time="2:38p"><b>Corry</b> override · marked Bella insulin done</AuditRow>
        </div>
      </Section>
    </>
  )
}
