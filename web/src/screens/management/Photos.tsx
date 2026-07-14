import { Icon } from '../../components/Icon'
import { useReportCards } from '../../lib/queries'
import { mediaUrl } from '../../lib/upload'
import { fmtDate } from '../../lib/format'

// Every report-card photo across all guests, newest first.
export function Photos() {
  const cards = useReportCards()

  const photos = (cards.data?.items ?? [])
    .flatMap((c) => (c.photoObjectKeys ?? []).map((key) => ({
      key,
      petName: c.petName ?? '',
      date: c.date,
    })))

  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Photos</span>

      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {photos.map((p) => (
            <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <img
                  src={mediaUrl(p.key)}
                  alt={`${p.petName} photo`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {p.petName} · {fmtDate(p.date)}
              </span>
            </div>
          ))}
        </div>
      ) : !cards.isLoading ? (
        <div
          style={{
            marginTop: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            textAlign: 'center',
            background: 'var(--surface-tint)', color: 'var(--lagoon-500)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
            padding: '48px 28px',
          }}
        >
          <Icon name="images" size={40} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            No photos yet
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 260 }}>
            Photos staff add to report cards show up here, newest first.
          </p>
        </div>
      ) : null}
    </>
  )
}
