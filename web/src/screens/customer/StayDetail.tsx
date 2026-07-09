import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, DogAvatar } from '../../components/primitives'
import { useReservations, useInvoice, useCancelReservation } from '../../lib/queries'
import { activeStays, STATUS_LABEL, statusTone, petLine } from '../../lib/stays'
import { fmtDate, fmtDateRange, fmtWeekday, fmtTime, nightsBetween, fmtDollars } from '../../lib/format'

function TimelineRow({
  label,
  detail,
  state,
  last,
}: {
  label: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
  last?: boolean
}) {
  const dot =
    state === 'upcoming'
      ? {
          width: 12,
          height: 12,
          borderRadius: 999,
          border: '2px solid var(--stone-200)',
          boxSizing: 'border-box' as const,
          background: 'var(--surface-card)',
        }
      : {
          width: 12,
          height: 12,
          borderRadius: 999,
          background: 'var(--lagoon-700)',
          boxShadow: state === 'current' ? '0 0 0 4px var(--seaglass-100)' : undefined,
        }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={dot} />
        {!last && (
          <span
            style={{
              width: 2,
              height: 26,
              background: state === 'done' ? 'var(--lagoon-700)' : 'var(--stone-200)',
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, marginTop: -3 }}>
        <span
          style={
            state === 'current'
              ? { fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }
              : { fontSize: 14, color: state === 'done' ? 'var(--text-body)' : 'var(--text-muted)' }
          }
        >
          {label}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail}</span>
      </div>
    </div>
  )
}

// Timeline position per status: index of the CURRENT step.
const STATUS_STEP: Record<string, number> = {
  requested: 0, approved: 1, checked_in: 3, in_stay: 3, checked_out: 4, completed: 4,
}

export function StayDetail({
  stayId,
  go,
  onBack,
}: {
  stayId: string | null
  go: (r: 'messages' | 'pay', id?: string) => void
  onBack: () => void
}) {
  const reservations = useReservations()
  const stay = (reservations.data?.items ?? []).find((r) => r.id === stayId)
    ?? activeStays(reservations.data?.items)[0]
  const invoiceQ = useInvoice(stay?.id ?? null)
  const cancel = useCancelReservation()
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!stay) {
    return (
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {reservations.isLoading ? 'Loading…' : 'No stay found.'}
      </div>
    )
  }

  const invoice = invoiceQ.data?.invoice
  const lineItems = invoiceQ.data?.lineItems ?? []
  const step = stay.status === 'cancelled' || stay.status === 'denied' ? -1 : STATUS_STEP[stay.status] ?? 0
  const rowState = (i: number): 'done' | 'current' | 'upcoming' =>
    step < 0 ? 'upcoming' : i < step ? 'done' : i === step ? 'current' : 'upcoming'

  const depositDue = stay.depositCents > 0 && (invoice ? invoice.depositPaidCents === 0 : false)
  const nights = nightsBetween(stay.startDate, stay.endDate)

  const doCancel = () => {
    if (!confirmCancel) {
      setConfirmCancel(true)
      return
    }
    cancel.mutate(stay.id, { onSuccess: onBack })
  }

  return (
    <>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <DogAvatar size={40} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>
              {petLine(stay.petNames)}'s stay
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {fmtDateRange(stay.startDate, stay.endDate)} · {nights} night{nights === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <Badge tone={statusTone(stay.status)}>{STATUS_LABEL[stay.status] ?? stay.status}</Badge>
      </div>

      {/* Timeline */}
      <div className="z-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <TimelineRow label="Requested" detail={fmtDate(stay.createdAt.slice(0, 10))} state={step >= 1 ? 'done' : rowState(0)} />
        <TimelineRow label="Approved" detail={stay.status === 'requested' ? 'Pending review' : 'Confirmed'} state={rowState(1)} />
        <TimelineRow
          label="Check-in"
          detail={`${fmtWeekday(stay.startDate).slice(0, 3)}, ${fmtTime(stay.dropoffLocalTime ?? '09:00')}`}
          state={rowState(2)}
        />
        <TimelineRow label="In residence" detail="Daily report cards" state={rowState(3)} />
        <TimelineRow
          label="Check-out"
          detail={`${fmtWeekday(stay.endDate).slice(0, 3)}, ${fmtTime(stay.pickupLocalTime ?? '17:00')}`}
          state={rowState(4)}
          last
        />
      </div>

      {/* Cost */}
      {invoice && (
        <div className="z-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--stone-600)',
            }}
          >
            Cost
          </span>
          {lineItems.map((li) => (
            <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>{li.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{fmtDollars(li.qty * li.unitCents)}</span>
            </div>
          ))}
          {invoice.depositPaidCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Deposit, paid</span>
              <span style={{ fontWeight: 600, color: 'var(--green-success)' }}>− {fmtDollars(invoice.depositPaidCents)}</span>
            </div>
          )}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
              {invoice.balanceCents > 0 ? 'Balance due' : 'Total'}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>
              {fmtDollars(invoice.balanceCents > 0 ? invoice.balanceCents : invoice.subtotalCents)}
            </span>
          </div>
          {(depositDue || invoice.balanceCents > 0) && (
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 14px',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--biscuit-700)' }}>
                {depositDue ? `${fmtDollars(stay.depositCents)} deposit due now` : 'Balance due at pick-up'}
              </span>
              <Button variant="gold" size="sm" onClick={() => go('pay', stay.id)}>
                {depositDue ? 'Pay deposit' : 'View invoice'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="md" icon="message-circle" style={{ flex: 1 }} onClick={() => go('messages')}>
          Message us
        </Button>
        {(stay.status === 'requested' || stay.status === 'approved') && (
          <Button variant="ghost" size="md" style={{ flex: 1 }} onClick={doCancel} disabled={cancel.isPending}>
            {confirmCancel ? 'Really cancel?' : cancel.isPending ? 'Cancelling…' : 'Cancel stay'}
          </Button>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Free cancellation up to 48 hours before check-in.
      </div>
    </>
  )
}
