import { Icon } from '../components/Icon'

// Photos is referenced in the Management IA but not part of the 5 designed
// hi-fi screens. Tasteful placeholder for the all-photos feed.
export function Photos() {
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Photos</span>
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
          The all-photos feed lands here
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 260 }}>
          Every report-card photo across all guests, newest first — not part of the first hi-fi cut.
        </p>
      </div>
    </>
  )
}
