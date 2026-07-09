import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card } from '../../components/primitives'
import { useCareTasks, useReservations } from '../../lib/queries'
import { seedToday, rosterDogs } from '../../lib/roster'
import { fmtDateRange, fmtTimeCompact } from '../../lib/format'

function DogGlyph() {
  return (
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        background: 'var(--seaglass-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--lagoon-500)',
        flex: 'none',
      }}
    >
      <Icon name="dog" size={22} />
    </span>
  )
}

function DogCard({
  title,
  subtitle,
  trailing,
  accent,
  onClick,
}: {
  title: string
  subtitle: ReactNode
  trailing: ReactNode
  accent?: 'coral'
  onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <Card accent={accent} style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <DogGlyph />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{subtitle}</span>
        </div>
        {trailing}
      </Card>
    </div>
  )
}

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']

export function DogRoster({ go }: { go: (r: 'checklist' | 'report-builder', petId?: string) => void }) {
  const tasksQ = useCareTasks({})
  const reservationsQ = useReservations()
  const today = seedToday(tasksQ.data?.items)
  const dogs = rosterDogs(reservationsQ.data?.items, tasksQ.data?.items, today)

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>
            Dogs here now
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {COUNT_WORDS[dogs.length] ?? dogs.length} in residence
          </span>
        </div>
        <button
          type="button"
          onClick={() => go('report-builder', dogs[0]?.petId)}
          aria-label="Camera"
          style={{
            width: 40,
            height: 40,
            border: 0,
            cursor: 'pointer',
            borderRadius: 999,
            background: 'var(--lagoon-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--foam-50)',
          }}
        >
          <Icon name="camera" size={19} />
        </button>
      </div>

      {/* Search + sort (visual only) */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '0 16px',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name="search" size={17} style={{ color: 'var(--stone-400)' }} />
          <span style={{ fontSize: 14 }}>Search dogs</span>
        </div>
        <Button variant="secondary" size="md" iconAfter="chevron-down" style={{ height: 48 }}>
          Urgency
        </Button>
      </div>

      {/* Roster */}
      {dogs.map((d) => {
        const dates = fmtDateRange(d.reservation.startDate, d.reservation.endDate)
        const next = d.nextTask
        return (
          <DogCard
            key={d.petId}
            accent={d.overdue > 0 ? 'coral' : undefined}
            title={d.breed ? `${d.name} · ${d.breed}` : d.name}
            subtitle={
              next
                ? `${dates} · next: ${next.label} ${fmtTimeCompact(next.scheduledLocalTime)}`
                : `${dates} · all tasks complete`
            }
            trailing={
              d.overdue > 0 ? (
                <Badge tone="error">Overdue</Badge>
              ) : d.due > 0 ? (
                <Badge tone="gold">{d.due} due</Badge>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 13,
                    color: 'var(--green-success)',
                    fontWeight: 600,
                  }}
                >
                  <Icon name="check" size={15} />
                  Done
                </span>
              )
            }
            onClick={() => go('checklist', d.petId)}
          />
        )
      })}
      {dogs.length === 0 && !reservationsQ.isLoading && (
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No dogs in residence right now.</div>
      )}
    </>
  )
}
