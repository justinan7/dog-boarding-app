import { Icon } from '../../components/Icon'

function Bubble({
  who,
  side,
  children,
  read,
}: {
  who: string
  side: 'left' | 'right'
  children: React.ReactNode
  read?: string
}) {
  const isRight = side === 'right'
  return (
    <div
      style={{
        alignSelf: isRight ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        alignItems: isRight ? 'flex-end' : 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)',
          paddingLeft: isRight ? 0 : 6, paddingRight: isRight ? 6 : 0,
        }}
      >
        {who}
      </span>
      <div
        style={
          isRight
            ? { background: 'var(--lagoon-700)', color: 'var(--foam-50)', borderRadius: '16px 16px 4px 16px', padding: '9px 14px', fontSize: 14 }
            : { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px 16px 16px 4px', padding: '9px 14px', fontSize: 14, boxShadow: 'var(--shadow-card)' }
        }
      >
        {children}
      </div>
      {read && <span style={{ fontSize: 11, color: 'var(--stone-400)' }}>{read}</span>}
    </div>
  )
}

export function Inbox({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '60px 20px 12px', borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)', display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>Diaz &amp; Jack</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rocky · booking request</span>
        </div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--surface-tint)', color: 'var(--lagoon-700)',
            borderRadius: 999, padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
          }}
        >
          <Icon name="eye" size={13} />
          Watching
        </span>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            alignSelf: 'center', textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)',
            background: 'var(--surface-tint)', borderRadius: 999, padding: '6px 12px',
          }}
        >
          Viewing silently · Jack can't see you · logged 2:14 PM
        </div>
        <Bubble who="Diaz" side="left">Any update on Rocky today?</Bubble>
        <Bubble who="Jack" side="right" read="Read 2:10 PM">Pickup is anytime before 6.</Bubble>
        <Bubble who="Diaz" side="left">Is the deposit refundable if we cancel?</Bubble>
        <div style={{ alignSelf: 'center', fontSize: 11.5, color: 'var(--red-error)', fontWeight: 600 }}>
          Unanswered 40m · SLA breach at 60m
        </div>
      </div>

      {/* Take-over footer */}
      <div style={{ padding: '12px 16px 30px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Reply as Zoomez management — Jack is muted and notified
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid var(--lagoon-700)', borderRadius: 999, padding: '5px 5px 5px 6px' }}>
          <span
            style={{
              width: 34, height: 34, borderRadius: 999, flex: 'none',
              background: 'var(--coral-500)', color: 'var(--foam-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="chevrons-right" size={18} />
          </span>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-muted)' }}>Slide to take over the thread</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>
          <span>Nudge Jack to reply</span>
          <span>Suggest an answer</span>
        </div>
      </div>
    </div>
  )
}
