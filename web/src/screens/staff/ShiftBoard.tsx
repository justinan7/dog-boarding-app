import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Section, SegmentedControl } from '../../components/primitives'

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
      <span
        style={{
          width: 26, height: 26, borderRadius: 999,
          background: 'var(--tide-300)', color: 'var(--tide-700)',
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

type Shift = {
  id: string
  day: string
  time: string
  dogs?: string
  meds?: string
  note?: string
}

const SHIFTS: Shift[] = [
  {
    id: 'sun',
    day: 'Sunday, Jul 6',
    time: '7:00a – 3:00p',
    dogs: '6 dogs',
    meds: '2 meds due',
    note: 'A manager will confirm.',
  },
  {
    id: 'mon',
    day: 'Monday, Jul 7',
    time: '3:00p – 9:00p',
    dogs: '6 dogs',
    meds: '2 meds due',
    note: 'Overlaps your 1 – 3p shift. A manager will confirm.',
  },
]

function ShiftCard({
  shift,
  claimed,
  onToggle,
}: {
  shift: Shift
  claimed: boolean
  onToggle: () => void
}) {
  return (
    <Section label={shift.day}>
      <Card
        style={{
          border: claimed ? '1.5px solid var(--biscuit-300)' : undefined,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: claimed ? 10 : 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            {shift.time}
          </span>
          <Badge tone="gold">{claimed ? 'Pending · you' : 'Open'}</Badge>
        </div>
        {claimed ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--biscuit-700)' }}>
            <Icon name="info" size={15} style={{ marginTop: 1, flex: 'none' }} />
            <span>{shift.note}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="paw-print" size={15} />
              {shift.dogs}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="pill" size={15} />
              {shift.meds}
            </span>
          </div>
        )}
        <Button variant={claimed ? 'secondary' : 'primary'} size="md" fullWidth onClick={onToggle}>
          {claimed ? 'Withdraw claim' : 'Claim shift'}
        </Button>
      </Card>
    </Section>
  )
}

function CompactRow({
  label,
  right,
  divider,
}: {
  label: string
  right: React.ReactNode
  divider?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 0',
        borderBottom: divider ? '1px solid var(--border-subtle)' : undefined,
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{label}</span>
      {right}
    </div>
  )
}

function AssigneeTag({ name }: { name: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
      <span
        style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={12} />
      </span>
      {name}
    </span>
  )
}

export function ShiftBoard() {
  const [tab, setTab] = useState('Open shifts')
  const [claimed, setClaimed] = useState<Record<string, boolean>>({ sun: false, mon: true })
  const [wedClaimed, setWedClaimed] = useState(false)

  const toggle = (id: string) => setClaimed((c) => ({ ...c, [id]: !c[id] }))

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>
          Shifts
        </span>
        <StaffChip name="Jack" />
      </div>

      <SegmentedControl options={['Open shifts', 'My schedule']} value={tab} onChange={setTab} />

      {tab === 'Open shifts' ? (
        <>
          {SHIFTS.map((s) => (
            <ShiftCard key={s.id} shift={s} claimed={!!claimed[s.id]} onToggle={() => toggle(s.id)} />
          ))}

          <Card style={{ padding: '4px 16px' }}>
            <CompactRow divider label="Tue, Jul 8 · 7a – 3p" right={<AssigneeTag name="Brette" />} />
            <CompactRow
              label="Wed, Jul 9 · 7a – 3p"
              right={
                wedClaimed ? (
                  <Badge tone="gold">Pending · you</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setWedClaimed(true)}>
                    Claim
                  </Button>
                )
              }
            />
          </Card>
        </>
      ) : (
        <Card style={{ padding: '4px 16px' }}>
          {claimed.sun && (
            <CompactRow divider label="Sun, Jul 6 · 7:00a – 3:00p" right={<Badge tone="gold">Pending · you</Badge>} />
          )}
          {claimed.mon && (
            <CompactRow divider label="Mon, Jul 7 · 3:00p – 9:00p" right={<Badge tone="gold">Pending · you</Badge>} />
          )}
          <CompactRow divider label="Tue, Jul 8 · 7a – 3p" right={<AssigneeTag name="Brette" />} />
          <CompactRow
            label="Wed, Jul 9 · 7a – 3p"
            right={wedClaimed ? <Badge tone="gold">Pending · you</Badge> : <AssigneeTag name="Brette" />}
          />
        </Card>
      )}
    </>
  )
}
