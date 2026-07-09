import { Icon, type IconName } from '../../components/Icon'
import { Badge, Button } from '../../components/primitives'
import { useReportCards, useReservations, useHeartReportCard } from '../../lib/queries'
import { mediaUrl } from '../../lib/upload'
import { fmtWeekday, fmtDate, nightsBetween, parseDate } from '../../lib/format'

function PhotoTile({
  icon,
  bg,
  onClick,
  children,
}: {
  icon: IconName
  bg: string
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '4 / 3.4',
        borderRadius: 'var(--radius-xl)',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: 'var(--lagoon-300)',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={26} />
      {children}
    </div>
  )
}

export function ReportCardPostcard({
  cardId,
  go,
  onBack,
}: {
  cardId: string | null
  go: (r: 'story' | 'messages', id?: string) => void
  onBack: () => void
}) {
  const cards = useReportCards()
  const reservations = useReservations()
  const heart = useHeartReportCard()

  const card = (cards.data?.items ?? []).find((c) => c.id === cardId)
    ?? (cards.data?.items ?? []).find((c) => c.status === 'sent')

  if (!card) {
    return (
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {cards.isLoading ? 'Loading…' : 'No report cards yet — they arrive during a stay.'}
      </div>
    )
  }

  const stay = (reservations.data?.items ?? []).find((r) => r.id === card.reservationId)
  const dayN = stay
    ? Math.min(
        nightsBetween(stay.startDate, card.date) + 1,
        Math.max(nightsBetween(stay.startDate, stay.endDate), 1),
      )
    : null
  const totalDays = stay ? Math.max(nightsBetween(stay.startDate, stay.endDate), 1) : null
  // Guard: card date before the stay window renders as day 1.
  const dayLabel = dayN !== null && totalDays !== null && parseDate(card.date) >= parseDate(stay!.startDate)
    ? ` · Day ${dayN} of ${totalDays}`
    : ''

  const hearted = !!card.heartedAt

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>
            {card.petName}'s day
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {fmtWeekday(card.date)}, {fmtDate(card.date)}{dayLabel}
          </span>
        </div>
      </div>

      {/* Postcard note */}
      <div
        style={{
          background: 'var(--surface-inverse)',
          borderRadius: 'var(--radius-xl)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--accent-gold)',
          }}
        >
          From your Zoomez team
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 21, lineHeight: 1.3, color: 'var(--text-inverse)',
          }}
        >
          "{card.bestMoment ?? `${card.petName} had a great day.`}"
        </span>
      </div>

      {/* Photo grid — real photos when the card has them, placeholder art otherwise */}
      {(card.photoObjectKeys?.length ?? 0) > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {card.photoObjectKeys!.slice(0, 4).map((key, i) => (
            <div
              key={key}
              onClick={() => go('story', card.id)}
              style={{
                aspectRatio: '4 / 3.4',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <img
                src={mediaUrl(key)}
                alt={`${card.petName} photo`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {i === 3 && card.photoObjectKeys!.length > 4 && (
                <span
                  style={{
                    position: 'absolute', right: 12, bottom: 10,
                    background: 'var(--lagoon-900)', color: 'var(--foam-50)',
                    borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                  }}
                >
                  +{card.photoObjectKeys!.length - 4}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <PhotoTile icon="sun" bg="var(--seaglass-100)" onClick={() => go('story', card.id)} />
          <PhotoTile icon="waves" bg="var(--seaglass-200)" onClick={() => go('story', card.id)} />
          <PhotoTile icon="bone" bg="var(--seaglass-200)" onClick={() => go('story', card.id)} />
          <PhotoTile icon="heart" bg="var(--seaglass-100)" onClick={() => go('story', card.id)} />
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Tap any photo for the full story
      </div>

      {/* Day badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {card.mood && <Badge tone="lagoon">{card.mood}</Badge>}
        {card.appetite && <Badge tone="lagoon">{card.appetite}</Badge>}
      </div>

      {/* Care log */}
      {card.careLogSummary && (
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-body)' }}>
            <Icon name="clipboard-check" size={17} style={{ color: 'var(--green-success)', flex: 'none' }} />
            {card.careLogSummary}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          variant="secondary"
          size="md"
          icon="heart"
          style={{ flex: 1 }}
          disabled={hearted || heart.isPending}
          onClick={() => heart.mutate(card.id)}
        >
          {hearted ? 'Hearted' : heart.isPending ? 'Hearting…' : 'Heart'}
        </Button>
        <Button variant="primary" size="md" icon="message-circle" style={{ flex: 1 }} onClick={() => go('messages')}>
          Reply
        </Button>
      </div>
    </>
  )
}
