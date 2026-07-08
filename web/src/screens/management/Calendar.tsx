import { Icon } from '../../components/Icon'
import { Eyebrow, Card, Button, DogAvatar } from '../../components/primitives'
import { useCapacity, useReservations, useReservationDecision, type CapacityNight } from '../../lib/queries'

function RoundBtn({ icon }: { icon: 'chevron-left' | 'chevron-right' }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-700)' }}>
      <Icon name={icon} size={17} />
    </div>
  )
}

function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  const wd = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2)
  return `${wd} ${d.getUTCDate()}`
}
function rangeLabel(start: string, end: string): string {
  const f = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${f(start)} → ${f(end)}`
}

export function Calendar() {
  const from = isoDate(0)
  const to = isoDate(5)
  const capacity = useCapacity(from, to)
  const requested = useReservations('requested')
  const decide = useReservationDecision()

  const nights: CapacityNight[] = capacity.data?.nights ?? []
  const cap = capacity.data?.capacity ?? 8
  const requests = requested.data?.items ?? []

  const monthLabel = new Date(`${from}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>{monthLabel}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Capacity: {cap} suites / night</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <RoundBtn icon="chevron-left" />
          <RoundBtn icon="chevron-right" />
        </div>
      </div>

      {/* Capacity strip */}
      <Card style={{ padding: '14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(nights.length, 1)},1fr)`, gap: 6, textAlign: 'center' }}>
          {nights.map((d) => (
            <div key={d.date} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dayLabel(d.date)}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: d.full ? 'var(--red-error)' : 'var(--text-heading)' }}>{d.booked}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: d.full ? 'var(--red-error)' : 'var(--green-success)' }}>{d.full ? 'FULL' : 'OK'}</span>
            </div>
          ))}
        </div>
      </Card>

      <Eyebrow>Pending requests · {requests.length}</Eyebrow>

      {requests.map((r) => {
        // Does this request overlap any FULL night in the visible window?
        const overlapsFull = nights.some((n) => n.full && n.date >= r.startDate && n.date < r.endDate)
        const busy = decide.isPending && decide.variables?.id === r.id
        return (
          <Card key={r.id} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DogAvatar size={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{r.petNames.join(', ') || 'Pet'}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{r.customerName} · {rangeLabel(r.startDate, r.endDate)}</span>
              </div>
            </div>
            {overlapsFull && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, background: 'var(--coral-200)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: 12.5, color: '#A94E33' }}>
                <Icon name="triangle-alert" size={15} style={{ marginTop: 1, flex: 'none' }} />
                <span>Overlaps a full night in this window.</span>
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {r.depositCents > 0 ? `$${(r.depositCents / 100).toFixed(0)} deposit held` : 'No deposit'}
              {r.notes ? ` · “${r.notes}”` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" style={{ flex: 1 }} disabled={busy} onClick={() => decide.mutate({ id: r.id, decision: 'deny' })}>Deny</Button>
              <Button variant="secondary" size="sm" style={{ flex: 1 }} disabled={busy} onClick={() => decide.mutate({ id: r.id, decision: 'waitlist' })}>Waitlist</Button>
              <Button variant="primary" size="sm" style={{ flex: 1.3 }} disabled={busy}
                onClick={() => decide.mutate({ id: r.id, decision: 'approve', body: overlapsFull ? { overrideCapacity: true } : {} })}>
                Approve
              </Button>
            </div>
          </Card>
        )
      })}
    </>
  )
}
