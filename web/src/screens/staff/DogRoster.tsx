import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card } from '../../components/primitives'

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

export function DogRoster({ go }: { go: (r: 'checklist' | 'report-builder') => void }) {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>
            Dogs here now
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Five in residence</span>
        </div>
        <button
          type="button"
          onClick={() => go('report-builder')}
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
      <DogCard
        accent="coral"
        title="Bella · Golden"
        subtitle="Jul 3 – 7 · Rimadyl 8:00a · feed 5:30p"
        trailing={<Badge tone="error">Overdue 3m</Badge>}
        onClick={() => go('checklist')}
      />

      <DogCard
        title="Biscuit · Beagle"
        subtitle={
          <>
            Next: lunch 12:00p ·{' '}
            <span style={{ color: 'var(--red-error)', fontWeight: 600 }}>allergy: chicken</span>
          </>
        }
        trailing={<Badge tone="gold">2 due</Badge>}
        onClick={() => go('checklist')}
      />

      <DogCard
        title="Max · Boxer"
        subtitle={
          <>
            <span style={{ color: 'var(--red-error)', fontWeight: 600 }}>Separate at feeding</span> · Jul 5 – 8
          </>
        }
        trailing={<Badge tone="lagoon">Insulin 6p</Badge>}
        onClick={() => go('checklist')}
      />

      <DogCard
        title="Cooper · Lab mix"
        subtitle="Jul 5 · all tasks complete"
        trailing={
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
        }
        onClick={() => go('checklist')}
      />
    </>
  )
}
