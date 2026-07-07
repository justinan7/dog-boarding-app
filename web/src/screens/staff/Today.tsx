import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Section } from '../../components/primitives'

type Route = 'checklist' | 'roster' | 'incident' | 'shifts'

function StaffChip({ name }: { name: string }) {
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
      <div
        style={{
          width: 26, height: 26, borderRadius: 999,
          background: 'var(--tide-300)', color: 'var(--tide-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={14} />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={13} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

function HereNowRow({
  name,
  breed,
  status,
  last,
  onOpen,
}: {
  name: string
  breed: string
  status: React.ReactNode
  last?: boolean
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: 999,
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}
      >
        <Icon name="dog" size={17} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{breed}</span>
      </div>
      {status}
    </div>
  )
}

export function StaffToday({ go }: { go: (r: Route) => void }) {
  const [heroDone, setHeroDone] = useState(false)

  return (
    <>
      {/* Shift status + staff switcher + SOS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'var(--surface-tint)', color: 'var(--lagoon-700)',
            borderRadius: 999, padding: '5px 13px',
            fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--green-success)' }} />
          On shift · 7a – 3p
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StaffChip name="Jack" />
          <button
            type="button"
            onClick={() => go('incident')}
            aria-label="Report incident"
            style={{
              width: 36, height: 36, borderRadius: 999, border: 0, cursor: 'pointer',
              background: 'var(--coral-200)', color: '#A94E33',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <Icon name="triangle-alert" size={17} />
          </button>
        </div>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, color: 'var(--text-heading)' }}>
          Saturday, Jul 5
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Five guests in residence · 5 tasks left today
        </div>
      </div>

      {/* Next up hero */}
      <Section label="Next up" labelColor="var(--accent-gold)">
        <div
          style={{
            background: 'var(--surface-inverse)',
            borderRadius: 'var(--radius-xl)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'var(--seaglass-200)', color: 'var(--lagoon-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }}
            >
              <Icon name="dog" size={22} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--foam-50)' }}>Rimadyl 75 mg</span>
              <span style={{ fontSize: 13.5, color: 'var(--seaglass-200)' }}>Bella · Golden Retriever</span>
            </div>
            {heroDone ? (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--green-success)', color: 'var(--foam-50)',
                  borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700,
                }}
              >
                <Icon name="check" size={13} />
                Logged
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--biscuit-500)', color: 'var(--lagoon-900)',
                  borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700,
                }}
              >
                Due 4m
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="gold"
              size="md"
              style={{ flex: 1 }}
              disabled={heroDone}
              onClick={() => setHeroDone(true)}
            >
              {heroDone ? 'Logged' : 'Log it'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              style={{
                flex: 1,
                ['--accent-primary' as string]: 'var(--seaglass-200)',
                color: 'var(--seaglass-200)',
                borderColor: 'rgba(207,228,218,0.4)',
              }}
            >
              Snooze
            </Button>
          </div>
        </div>
      </Section>

      {/* Here now */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--stone-600)',
            }}
          >
            Here now · 5 dogs
          </span>
          <span
            onClick={() => go('roster')}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)', cursor: 'pointer' }}
          >
            See all
          </span>
        </div>
        <Card style={{ padding: '4px 16px' }}>
          <HereNowRow name="Biscuit" breed="Beagle" onOpen={() => go('checklist')} status={<Badge tone="gold">2 due</Badge>} />
          <HereNowRow name="Bella" breed="Golden Retriever" onOpen={() => go('checklist')} status={<Badge tone="gold">1 due</Badge>} />
          <HereNowRow
            name="Cooper"
            breed="Lab mix"
            onOpen={() => go('checklist')}
            status={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--green-success)', fontWeight: 600 }}>
                <Icon name="check" size={15} />
                Done
              </span>
            }
          />
          <HereNowRow name="Max" breed="Boxer" last onOpen={() => go('checklist')} status={<Badge tone="error">Med</Badge>} />
        </Card>
      </div>

      {/* Today's progress */}
      <div
        style={{
          background: 'var(--surface-tint)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>Today's progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>9 of 14 tasks</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'var(--white)', overflow: 'hidden' }}>
          <div style={{ width: '64%', height: '100%', background: 'var(--lagoon-500)' }} />
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>3 photos captured · 1 report card sent</div>
      </div>
    </>
  )
}
