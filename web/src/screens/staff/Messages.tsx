import { Icon } from '../../components/Icon'

// Staff Messages tab — the tab exists in the designed IA ("in-app customer
// threads assigned to me, with an oversight banner") but has no hi-fi screen in
// the handoff. Honest placeholder until the thread UI ships with API wiring
// (task C3); the customer Messages screen holds the thread idiom to reuse.
export function StaffMessages() {
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Messages</span>
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
        <Icon name="message-circle" size={40} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
          Your assigned threads land here
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 270 }}>
          Customer conversations assigned to you — sent as Zoomez, with management
          able to view or take over. Not part of the first hi-fi cut.
        </p>
      </div>
    </>
  )
}
