import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Section } from '../../components/primitives'

/* ---------- Dog select pill ("Who's coming") ---------- */
function DogPill({
  name,
  selected,
  onToggle,
}: {
  name: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        background: selected ? 'var(--lagoon-700)' : 'var(--surface-card)',
        color: selected ? 'var(--foam-50)' : 'var(--text-heading)',
        border: selected ? '1px solid var(--lagoon-700)' : '1px solid var(--border-subtle)',
        borderRadius: 999,
        padding: '6px 16px 6px 6px',
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'var(--seaglass-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: selected ? 'var(--lagoon-700)' : 'var(--lagoon-500)',
        }}
      >
        <Icon name="dog" size={15} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
      {selected && <Icon name="check" size={15} />}
    </button>
  )
}

/* ---------- Checkbox (local — matches DS Checkbox) ---------- */
function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: 0,
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          flex: 'none',
          borderRadius: 7,
          border: checked ? '1.5px solid var(--lagoon-700)' : '1.5px solid var(--stone-400)',
          background: checked ? 'var(--lagoon-700)' : 'var(--surface-card)',
          color: 'var(--foam-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--dur-fast) var(--ease-out)',
        }}
      >
        {checked && <Icon name="check" size={14} />}
      </span>
      <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{label}</span>
    </button>
  )
}

/* ---------- Calendar day cell ---------- */
type DayKind = 'outside' | 'normal' | 'rangeStart' | 'rangeMid' | 'rangeEnd' | 'unavailable'

function Day({ n, kind = 'normal' }: { n: number; kind?: DayKind }) {
  const inRange = kind === 'rangeStart' || kind === 'rangeMid' || kind === 'rangeEnd'
  return (
    <span
      style={{
        padding: '7px 0',
        color:
          kind === 'outside'
            ? 'var(--stone-200)'
            : kind === 'unavailable'
              ? 'var(--stone-400)'
              : inRange
                ? 'var(--foam-50)'
                : undefined,
        background: inRange ? 'var(--lagoon-700)' : undefined,
        borderRadius:
          kind === 'rangeStart' ? '999px 0 0 999px' : kind === 'rangeEnd' ? '0 999px 999px 0' : undefined,
        fontWeight: inRange ? 600 : undefined,
        textDecoration: kind === 'unavailable' ? 'line-through' : undefined,
      }}
    >
      {n}
    </span>
  )
}

const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
} as const

const NIGHTS = 2
const PLAY_DAYS = 3 // Fri – Sun
const BASE = 120

export function BookStay() {
  const [dogs, setDogs] = useState<Record<string, boolean>>({ Biscuit: true, Bella: false })
  const [bath, setBath] = useState(false)
  const [play, setPlay] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const estimate = BASE + (bath ? 25 : 0) + (play ? 10 * PLAY_DAYS : 0)

  return (
    <>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="chevron-left" size={22} style={{ color: 'var(--lagoon-700)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>
          Book a stay
        </span>
      </div>

      {/* Who's coming */}
      <Section label="Who's coming">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Biscuit', 'Bella'] as const).map((name) => (
            <DogPill
              key={name}
              name={name}
              selected={!!dogs[name]}
              onToggle={() => setDogs((d) => ({ ...d, [name]: !d[name] }))}
            />
          ))}
        </div>
      </Section>

      {/* Calendar */}
      <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Icon name="chevron-left" size={18} style={{ color: 'var(--stone-400)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>July 2026</span>
          <Icon name="chevron-right" size={18} style={{ color: 'var(--lagoon-700)' }} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 4,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--stone-400)',
          }}
        >
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 4,
            textAlign: 'center',
            fontSize: 13.5,
            color: 'var(--text-body)',
          }}
        >
          <Day n={28} kind="outside" /><Day n={29} kind="outside" /><Day n={30} kind="outside" />
          <Day n={1} /><Day n={2} /><Day n={3} /><Day n={4} kind="rangeStart" />
          <Day n={5} kind="rangeMid" /><Day n={6} kind="rangeEnd" />
          <Day n={7} /><Day n={8} /><Day n={9} /><Day n={10} /><Day n={11} />
          <Day n={12} kind="unavailable" /><Day n={13} kind="unavailable" />
          <Day n={14} /><Day n={15} /><Day n={16} /><Day n={17} /><Day n={18} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
            Jul 4 – 6 · {NIGHTS} nights
          </span>
          <Badge tone="gold">3 of 6 suites open</Badge>
        </div>
      </div>

      {/* Drop-off / Pick-up */}
      <div style={{ ...cardStyle, padding: '4px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Drop-off</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
            Friday, 9:00 AM <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Pick-up</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
            Sunday, 5:00 PM <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
          </span>
        </div>
      </div>

      {/* Add-ons */}
      <Section label="A little extra">
        <div style={{ ...cardStyle, padding: '4px 16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <Checkbox label="Bath before pick-up" checked={bath} onToggle={() => setBath((v) => !v)} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>$25</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <Checkbox label="Extra play session, daily" checked={play} onToggle={() => setPlay((v) => !v)} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>$10 / day</span>
          </div>
        </div>
      </Section>

      {/* Note to the team */}
      <input
        type="text"
        placeholder="Anything the team should know?"
        style={{
          width: '100%',
          height: 48,
          boxSizing: 'border-box',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0 16px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-body)',
        }}
      />

      {/* Estimate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>
          ${estimate} estimated
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>$40 deposit on approval</span>
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={submitted}
        onClick={() => setSubmitted(true)}
      >
        {submitted ? 'Requested ✓' : 'Request this stay'}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        We'll confirm your request within a day.
      </div>
    </>
  )
}
