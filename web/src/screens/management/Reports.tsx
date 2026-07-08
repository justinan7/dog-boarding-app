import { Icon } from '../../components/Icon'
import { Section, Card, Button, Badge, Eyebrow } from '../../components/primitives'
import { useReportsSummary, useAudit } from '../../lib/queries'

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

function StaffRow({ name, stats, badge, avatarBg, avatarFg, last }: {
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

// 'reservation.approve' → 'approved booking', etc. Falls back to the raw action.
function describeAction(action: string, subjectType: string): string {
  const map: Record<string, string> = {
    'reservation.approve': 'approved a booking',
    'reservation.deny': 'denied a booking',
    'thread.take_over': 'took over a thread',
    'thread.join': 'joined a thread',
    'care_task.override': 'overrode a task',
    'shift_claim.approve': 'approved a shift claim',
    'oversight.viewed': 'viewed a thread',
    'incident.severe': 'filed a severe incident',
  }
  return map[action] ?? `${action.replace(/[._]/g, ' ')} · ${subjectType}`
}

const AVATARS = [
  { bg: 'var(--tide-300)', fg: 'var(--tide-700)' },
  { bg: 'var(--biscuit-300)', fg: 'var(--biscuit-700)' },
  { bg: 'var(--seaglass-200)', fg: 'var(--lagoon-500)' },
]

export function Reports() {
  const month = new Date().toISOString().slice(0, 7)
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const summary = useReportsSummary(month)
  const audit = useAudit()

  const occ = summary.data?.occupancy
  const rev = summary.data?.revenue
  const staff = summary.data?.staff ?? []
  const cap = 8
  const peak = Math.max(...(occ?.nights.map((n) => n.booked) ?? [1]), 1)

  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Reports</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>
          {monthLabel}
          <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
        </div>
      </div>

      {/* Occupancy */}
      {occ && (
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Eyebrow>Occupancy</Eyebrow>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>avg {occ.avgPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
            {occ.nights.map((n) => (
              <div key={n.date} title={`${n.date}: ${n.booked}`} style={{
                flex: 1,
                height: `${Math.max((n.booked / cap) * 100, 3)}%`,
                background: n.booked >= peak && peak > 0 ? 'var(--lagoon-500)' : 'var(--seaglass-200)',
                borderRadius: '3px 3px 0 0',
              }} />
            ))}
          </div>
        </Card>
      )}

      {/* Revenue */}
      {rev && (
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow>Revenue · {monthLabel.split(' ')[0]}</Eyebrow>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Boarding</span>
            <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{usd(rev.boardingCents)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Upsells</span>
            <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{usd(rev.upsellsCents)}</span>
          </div>
          <div className="z-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>{usd(rev.totalCents)}</span>
          </div>
          {rev.outstandingCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 13px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--biscuit-700)' }}>{usd(rev.outstandingCents)} outstanding · {rev.outstandingCount} invoice{rev.outstandingCount === 1 ? '' : 's'}</span>
              <Button variant="gold" size="sm">Chase</Button>
            </div>
          )}
        </Card>
      )}

      {/* Per-staff */}
      {staff.length > 0 && (
        <Card style={{ padding: '4px 16px' }}>
          {staff.map((s, i) => (
            <StaffRow key={s.display} name={s.display} stats={`${s.shifts} shifts · ${s.tasks} tasks`}
              badge={`${s.onTimePct}% on time`} avatarBg={AVATARS[i % AVATARS.length]!.bg} avatarFg={AVATARS[i % AVATARS.length]!.fg}
              last={i === staff.length - 1} />
          ))}
        </Card>
      )}

      {/* Audit log */}
      <Section label="Audit log">
        <div style={{ background: 'var(--surface-inverse)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(audit.data?.items ?? []).slice(0, 8).map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
              <span style={{ color: 'var(--seaglass-200)', width: 52, flex: 'none' }}>
                {new Date(a.occurredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span style={{ color: 'var(--foam-50)' }}>
                <b>{a.actorDisplay ?? a.actorRole ?? 'System'}</b> {describeAction(a.action, a.subjectType)}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
