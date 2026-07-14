import { Icon } from '../../components/Icon'
import { Wordmark, Badge, Button } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useReservations, useReportCards, useInvoice, useWaivers, useSignWaiver } from '../../lib/queries'
import { activeStays, STATUS_LABEL, statusTone, petLine } from '../../lib/stays'
import { fmtDateRange, fmtWeekday, fmtTime, fmtStamp, nightsBetween, fmtDollars } from '../../lib/format'

function AccountChip({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 999,
        padding: '5px 12px 5px 5px',
      }}
    >
      <span
        style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={15} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={14} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function CustomerHome({ go }: { go: (r: 'book' | 'report-card' | 'stay' | 'pay' | 'messages', id?: string) => void }) {
  const { user } = useAuth()
  const reservations = useReservations()
  const cards = useReportCards()

  const firstName = (user?.name ?? 'there').split(' ')[0]
  const stay = activeStays(reservations.data?.items)[0]
  const invoice = useInvoice(stay?.id ?? null)

  // "Before check-in" shows only what's genuinely outstanding.
  const depositDue = !!stay && stay.depositCents > 0 &&
    (invoice.data?.invoice ? invoice.data.invoice.depositPaidCents === 0 : false)
  const balanceDue = invoice.data?.invoice ? invoice.data.invoice.balanceCents > 0 : false

  const latestCard = (cards.data?.items ?? []).find((c) => c.status === 'sent')

  // Waiver: real e-sign when DocuSeal is live; "launches soon" otherwise.
  const waivers = useWaivers()
  const signWaiver = useSignWaiver()
  const pendingWaiver = (waivers.data?.items ?? []).find((w) => w.status !== 'signed')
  const waiverEnabled = waivers.data?.enabled ?? false
  const openSigning = () => {
    if (!pendingWaiver || signWaiver.isPending) return
    signWaiver.mutate(pendingWaiver.templateId, {
      onSuccess: ({ url }) => window.open(url, '_blank'),
    })
  }

  const subline = !stay
    ? 'No stays on the books yet.'
    : stay.status === 'requested'
      ? 'Your request is with the team.'
      : stay.status === 'approved'
        ? `${stay.petNames[0] ?? 'Your dog'} checks in ${fmtWeekday(stay.startDate)} at ${fmtTime(stay.dropoffLocalTime ?? '09:00')}.`
        : `${petLine(stay.petNames)} ${stay.petNames.length > 1 ? 'are' : 'is'} in residence.`

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--lagoon-700)',
            }}
          >
            <Icon name="bell" size={18} />
          </div>
          <AccountChip name={firstName ?? ''} />
        </div>
      </div>

      {/* Greeting */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.05, color: 'var(--text-heading)' }}>
          {greeting()}, {firstName}.
        </div>
        <div style={{ marginTop: 6, fontSize: 15, color: 'var(--text-muted)' }}>
          {reservations.isLoading ? 'Loading your stays…' : subline}
        </div>
      </div>

      {/* Upcoming stay */}
      {stay ? (
        <div
          onClick={() => go('stay', stay.id)}
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: 18,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 999,
                background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }}
            >
              <Icon name="dog" size={24} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
                {petLine(stay.petNames)}'s stay
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {stay.pets[0]?.breed ? `${stay.pets[0].breed} · ` : ''}
                {fmtDateRange(stay.startDate, stay.endDate)} · {nightsBetween(stay.startDate, stay.endDate)} nights
              </span>
            </div>
            <Badge tone={statusTone(stay.status)}>{STATUS_LABEL[stay.status] ?? stay.status}</Badge>
          </div>
          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Drop-off</span>
            <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
              {fmtWeekday(stay.startDate)}, {fmtTime(stay.dropoffLocalTime ?? '09:00')}
            </span>
          </div>
        </div>
      ) : !reservations.isLoading ? (
        <div
          style={{
            background: 'var(--surface-tint)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <Icon name="calendar-days" size={22} style={{ color: 'var(--lagoon-500)' }} />
          <span style={{ fontSize: 14, color: 'var(--text-body)' }}>
            Book your first stay and it'll live here.
          </span>
        </div>
      ) : null}

      {/* Before check-in */}
      {stay && (depositDue || balanceDue || stay.status === 'approved') && (
        <div
          style={{
            background: 'var(--surface-tint)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--lagoon-700)',
            }}
          >
            Before check-in
          </div>
          {(depositDue || balanceDue) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>
                  {depositDue
                    ? `${fmtDollars(stay.depositCents)} deposit`
                    : `${fmtDollars(invoice.data?.invoice?.balanceCents ?? 0)} balance`}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {depositDue ? `Holds ${stay.petNames[0] ?? 'the'}'s suite` : 'Due at pick-up'}
                </span>
              </div>
              <Button variant="primary" size="sm" onClick={() => go('pay', stay.id)}>
                {depositDue ? 'Pay now' : 'View invoice'}
              </Button>
            </div>
          )}
          {pendingWaiver ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>{pendingWaiver.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {waiverEnabled ? 'Two minutes, one signature' : 'E-signature launches soon'}
                </span>
              </div>
              <Button variant="secondary" size="sm" disabled={!waiverEnabled || signWaiver.isPending} onClick={openSigning}>
                {signWaiver.isPending ? 'Opening…' : 'Review & sign'}
              </Button>
            </div>
          ) : (waivers.data?.items.length ?? 0) > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-body)' }}>
              <Icon name="file-check" size={17} style={{ color: 'var(--green-success)' }} />
              Boarding waiver signed
            </div>
          ) : null}
        </div>
      )}

      {/* Latest report card */}
      {latestCard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--stone-600)',
              }}
            >
              Latest report card
            </span>
          </div>
          <div
            onClick={() => go('report-card', latestCard.id)}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 64, height: 56, borderRadius: 'var(--radius-md)',
                background: 'var(--seaglass-100)', color: 'var(--lagoon-300)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }}
            >
              <Icon name="sun" size={22} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {latestCard.sentAt ? fmtStamp(latestCard.sentAt) : ''}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--text-heading)' }}>
                "{(latestCard.bestMoment ?? `${latestCard.petName}'s day`).split(' — ')[0]}"
              </span>
            </div>
            <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-400)' }} />
          </div>
        </div>
      )}

      <Button variant="gold" size="lg" fullWidth icon="calendar-days" onClick={() => go('book')}>
        Book a stay
      </Button>
    </>
  )
}
