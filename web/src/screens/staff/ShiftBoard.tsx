import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Section, SegmentedControl } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useShifts, useMyShifts, useClaimShift, useWithdrawClaim, type Shift } from '../../lib/queries'
import { fmtDayLong, fmtDate, fmtTimeCompact } from '../../lib/format'

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

const timeRange = (s: Shift) => `${fmtTimeCompact(s.windowStartLocal)} – ${fmtTimeCompact(s.windowEndLocal)}`

function ShiftCard({
  shift,
  mine,
  busy,
  error,
  onClaim,
  onWithdraw,
}: {
  shift: Shift
  mine: boolean
  busy: boolean
  error?: string | null
  onClaim: () => void
  onWithdraw: () => void
}) {
  return (
    <Section label={fmtDayLong(shift.windowDate)}>
      <Card
        style={{
          border: mine ? '1.5px solid var(--biscuit-300)' : undefined,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: mine ? 10 : 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            {timeRange(shift)}
          </span>
          <Badge tone="gold">{mine ? 'Pending · you' : 'Open'}</Badge>
        </div>
        {mine ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--biscuit-700)' }}>
            <Icon name="info" size={15} style={{ marginTop: 1, flex: 'none' }} />
            <span>A manager will confirm.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="paw-print" size={15} />
              {shift.dogCount ?? '—'} dogs
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="pill" size={15} />
              {shift.medRoundCount ?? '—'} meds due
            </span>
          </div>
        )}
        {error && (
          <div style={{ fontSize: 13, color: 'var(--red-error)' }}>{error}</div>
        )}
        <Button
          variant={mine ? 'secondary' : 'primary'}
          size="md"
          fullWidth
          disabled={busy}
          onClick={mine ? onWithdraw : onClaim}
        >
          {busy ? '…' : mine ? 'Withdraw claim' : 'Claim shift'}
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
  const { user } = useAuth()
  const [tab, setTab] = useState('Open shifts')
  const shiftsQ = useShifts()
  const myShiftsQ = useMyShifts()
  const claim = useClaimShift()
  const withdraw = useWithdrawClaim()
  const [claimError, setClaimError] = useState<{ id: string; message: string } | null>(null)

  const myStaffId = user?.staffId
  const shifts = shiftsQ.data?.items ?? []
  const firstName = (user?.name ?? '').split(' ')[0] || 'You'

  // Claimable cards: open shifts + shifts I have a pending claim on.
  const board = shifts.filter(
    (s) => s.status === 'open' || (s.activeClaim?.staffId === myStaffId && s.activeClaim?.state === 'pending'),
  )
  // Everyone else's shifts, compact.
  const others = shifts.filter(
    (s) => s.activeClaim && s.activeClaim.staffId !== myStaffId,
  )

  const doClaim = (id: string) => {
    setClaimError(null)
    claim.mutate(id, {
      onError: (e) => setClaimError({ id, message: e instanceof Error ? e.message : 'Claim failed' }),
    })
  }

  const mySchedule = (myShiftsQ.data?.items ?? [])
    .filter((row) => row.claim.state === 'pending' || row.claim.state === 'approved')
    .sort((a, b) => a.shift.windowDate.localeCompare(b.shift.windowDate))

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>
          Shifts
        </span>
        <StaffChip name={firstName} />
      </div>

      <SegmentedControl options={['Open shifts', 'My schedule']} value={tab} onChange={setTab} />

      {tab === 'Open shifts' ? (
        <>
          {board.map((s) => (
            <ShiftCard
              key={s.id}
              shift={s}
              mine={s.activeClaim?.staffId === myStaffId && s.activeClaim?.state === 'pending'}
              busy={claim.isPending || withdraw.isPending}
              error={claimError?.id === s.id ? claimError.message : null}
              onClaim={() => doClaim(s.id)}
              onWithdraw={() => withdraw.mutate(s.id)}
            />
          ))}
          {board.length === 0 && !shiftsQ.isLoading && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No open shifts right now.</div>
          )}

          {others.length > 0 && (
            <Card style={{ padding: '4px 16px' }}>
              {others.map((s, i) => (
                <CompactRow
                  key={s.id}
                  divider={i < others.length - 1}
                  label={`${fmtDate(s.windowDate)} · ${timeRange(s)}`}
                  right={
                    s.activeClaim?.state === 'pending'
                      ? <Badge tone="gold">Pending · {s.activeClaim.staffDisplay.split(' ')[0]}</Badge>
                      : <AssigneeTag name={s.activeClaim?.staffDisplay.split(' ')[0] ?? '—'} />
                  }
                />
              ))}
            </Card>
          )}
        </>
      ) : (
        <Card style={{ padding: '4px 16px' }}>
          {mySchedule.map((row, i) => (
            <CompactRow
              key={row.claim.id}
              divider={i < mySchedule.length - 1}
              label={`${fmtDate(row.shift.windowDate)} · ${timeRange(row.shift as Shift)}`}
              right={
                row.claim.state === 'pending'
                  ? <Badge tone="gold">Pending · you</Badge>
                  : <Badge tone="success">Approved</Badge>
              }
            />
          ))}
          {mySchedule.length === 0 && !myShiftsQ.isLoading && (
            <div style={{ padding: '13px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
              Nothing on your schedule yet — claim an open shift.
            </div>
          )}
        </Card>
      )}
    </>
  )
}
