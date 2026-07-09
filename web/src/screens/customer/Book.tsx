import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Section } from '../../components/primitives'
import { usePets, useCapacity, useAddons, useCreateReservation } from '../../lib/queries'
import { fmtDateRange } from '../../lib/format'

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
      <span style={{ fontSize: 14, color: 'var(--text-body)', textAlign: 'left' }}>{label}</span>
    </button>
  )
}

const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
} as const

// The demo world lives in July 2026 (the seed's sample month). A month pager
// comes with the real rate card.
const YEAR = 2026
const MONTH = 7
const MONTH_LABEL = 'July 2026'
const NIGHTLY_CENTS = 5500 // placeholder rate — rate card is a management setting later

const ymd = (day: number) => `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export function BookStay() {
  const petsQ = usePets()
  const addonsQ = useAddons()
  const capacityQ = useCapacity(ymd(1), `${YEAR}-08-01`)
  const create = useCreateReservation()

  const [selectedPets, setSelectedPets] = useState<Set<string>>(new Set())
  const [start, setStart] = useState<number | null>(null)
  const [end, setEnd] = useState<number | null>(null)
  const [addons, setAddons] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')

  const pets = petsQ.data?.items ?? []
  // Default-select the first dog once loaded.
  const firstPetId = pets[0]?.id
  useEffect(() => {
    if (firstPetId) setSelectedPets((s) => (s.size === 0 ? new Set([firstPetId]) : s))
  }, [firstPetId])

  const fullNights = new Set(
    (capacityQ.data?.nights ?? []).filter((n) => n.full).map((n) => Number(n.date.slice(8, 10))),
  )
  const capacity = capacityQ.data?.capacity ?? 8

  const togglePet = (id: string) =>
    setSelectedPets((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pickDay = (day: number) => {
    if (create.isSuccess) return
    if (start === null || day < start || end !== null) {
      setStart(day)
      setEnd(null)
    } else if (day === start) {
      setStart(null)
    } else {
      setEnd(day)
    }
  }

  const nights = start !== null && end !== null ? end - start : 0
  // Fewest suites open across the selected nights (the constraining night).
  const suitesOpen = start !== null && end !== null
    ? Math.min(...(capacityQ.data?.nights ?? [])
        .filter((n) => {
          const d = Number(n.date.slice(8, 10))
          return n.date.slice(5, 7) === String(MONTH).padStart(2, '0') && d >= start && d < end
        })
        .map((n) => capacity - n.booked), capacity)
    : null

  const catalog = addonsQ.data?.items ?? []
  const toggleAddon = (id: string) =>
    setAddons((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const addonCents = catalog
    .filter((a) => addons.has(a.id))
    .reduce((sum, a) => sum + a.priceCents * (a.per === 'day' ? Math.max(nights, 1) : 1), 0)
  const estimateCents = nights * NIGHTLY_CENTS * Math.max(selectedPets.size, 1) + addonCents

  // July 2026 grid: the 1st is a Wednesday; pad from Sun Jun 28.
  const firstWeekday = new Date(YEAR, MONTH - 1, 1).getDay()
  const daysInMonth = new Date(YEAR, MONTH, 0).getDate()

  const dayKind = (day: number): 'normal' | 'rangeStart' | 'rangeMid' | 'rangeEnd' | 'unavailable' => {
    if (start !== null && day === start) return 'rangeStart'
    if (start !== null && end !== null && day > start && day < end) return 'rangeMid'
    if (end !== null && day === end) return 'rangeEnd'
    if (fullNights.has(day)) return 'unavailable'
    return 'normal'
  }

  const canSubmit = selectedPets.size > 0 && nights > 0 && !create.isPending && !create.isSuccess

  const submit = () => {
    if (!canSubmit || start === null || end === null) return
    create.mutate({
      petIds: [...selectedPets],
      startDate: ymd(start),
      endDate: ymd(end),
      dropoffLocalTime: '09:00',
      pickupLocalTime: '17:00',
      notes: note.trim() || undefined,
    })
  }

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pets.map((p) => (
            <DogPill
              key={p.id}
              name={p.name}
              selected={selectedPets.has(p.id)}
              onToggle={() => togglePet(p.id)}
            />
          ))}
          {petsQ.isLoading && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading your dogs…</span>}
        </div>
      </Section>

      {/* Calendar */}
      <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Icon name="chevron-left" size={18} style={{ color: 'var(--stone-200)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>{MONTH_LABEL}</span>
          <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-200)' }} />
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
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`pad-${i}`} style={{ padding: '7px 0', color: 'var(--stone-200)' }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const kind = dayKind(day)
            const inRange = kind === 'rangeStart' || kind === 'rangeMid' || kind === 'rangeEnd'
            return (
              <span
                key={day}
                onClick={() => pickDay(day)}
                style={{
                  padding: '7px 0',
                  cursor: 'pointer',
                  color: kind === 'unavailable' ? 'var(--stone-400)' : inRange ? 'var(--foam-50)' : undefined,
                  background: inRange ? 'var(--lagoon-700)' : undefined,
                  borderRadius:
                    kind === 'rangeStart' && end === null ? 999
                      : kind === 'rangeStart' ? '999px 0 0 999px'
                        : kind === 'rangeEnd' ? '0 999px 999px 0' : undefined,
                  fontWeight: inRange ? 600 : undefined,
                  textDecoration: kind === 'unavailable' ? 'line-through' : undefined,
                }}
              >
                {day}
              </span>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
            {nights > 0 && start !== null && end !== null
              ? `${fmtDateRange(ymd(start), ymd(end))} · ${nights} night${nights === 1 ? '' : 's'}`
              : start !== null
                ? 'Pick a check-out day'
                : 'Pick a check-in day'}
          </span>
          {suitesOpen !== null && (
            <Badge tone={suitesOpen > 0 ? 'gold' : 'error'}>
              {suitesOpen > 0 ? `${suitesOpen} of ${capacity} suites open` : 'Full — waitlist'}
            </Badge>
          )}
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
            9:00 AM <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Pick-up</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>
            5:00 PM <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
          </span>
        </div>
      </div>

      {/* Add-ons */}
      <Section label="A little extra">
        <div style={{ ...cardStyle, padding: '4px 16px' }}>
          {catalog.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < catalog.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <Checkbox label={a.label} checked={addons.has(a.id)} onToggle={() => toggleAddon(a.id)} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', flex: 'none' }}>
                ${a.priceCents / 100}{a.per === 'day' ? ' / day' : ''}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Note to the team */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
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
          ${Math.round(estimateCents / 100)} estimated
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>$40 deposit on approval</span>
      </div>
      {create.isError && (
        <div style={{ fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }}>
          {create.error instanceof Error ? create.error.message : 'Something went wrong — try again.'}
        </div>
      )}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!canSubmit}
        onClick={submit}
      >
        {create.isSuccess ? 'Requested ✓' : create.isPending ? 'Requesting…' : 'Request this stay'}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        {create.isSuccess ? 'The team will confirm within a day — watch Home for the status.' : "We'll confirm your request within a day."}
      </div>
    </>
  )
}
