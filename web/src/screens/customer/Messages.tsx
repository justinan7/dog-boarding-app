import { Fragment, useState } from 'react'
import { Icon } from '../../components/Icon'

type Msg =
  | { kind: 'own'; text: string; read?: string }
  | { kind: 'staff'; who: string; text: string }
  | { kind: 'photo' }

const SEED: Msg[] = [
  { kind: 'own', text: 'Just dropped Biscuit off — his blue blanket is in the bag.', read: 'Read 9:13 AM' },
  { kind: 'staff', who: 'Brette', text: 'Blanket’s already in his suite. He’s sniffing every corner — settling in beautifully.' },
  { kind: 'photo' },
  { kind: 'own', text: 'Oh he looks so happy. Thank you.' },
]

function OwnBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        maxWidth: '78%',
        background: 'var(--lagoon-700)',
        color: 'var(--foam-50)',
        borderRadius: '18px 18px 4px 18px',
        padding: '10px 15px',
        fontSize: 14.5,
        lineHeight: 1.45,
      }}
    >
      {text}
    </div>
  )
}

export function CustomerMessages({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(SEED)
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { kind: 'own', text }])
    setDraft('')
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-page)',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-body)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '64px 20px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>Zoomez concierge</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Biscuit · Jul 4 – 6</span>
        </div>
        <div
          style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'var(--surface-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--lagoon-700)',
          }}
        >
          <Icon name="info" size={17} />
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--stone-400)' }}>
          Friday, Jul 4 · 9:12 AM
        </div>
        {messages.map((m, i) => {
          if (m.kind === 'own') {
            return (
              <Fragment key={`m-${i}`}>
                <OwnBubble text={m.text} />
                {m.read && (
                  <div style={{ alignSelf: 'flex-end', fontSize: 11.5, color: 'var(--stone-400)' }}>
                    {m.read}
                  </div>
                )}
              </Fragment>
            )
          }
          if (m.kind === 'staff') {
            return (
              <div key={`m-${i}`} style={{ alignSelf: 'flex-start', maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)', paddingLeft: 6 }}>{m.who}</span>
                <div
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '10px 15px',
                    fontSize: 14.5,
                    lineHeight: 1.45,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            )
          }
          return (
            <div key={`m-${i}`} style={{ alignSelf: 'flex-start', maxWidth: '66%', width: '66%' }}>
              <div
                style={{
                  aspectRatio: '4/3',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--seaglass-100)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lagoon-300)',
                }}
              >
                <Icon name="image" size={30} />
              </div>
            </div>
          )
        })}
        <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: 'var(--stone-400)', paddingLeft: 6 }}>
          Brette is typing…
        </div>
      </div>

      {/* Composer */}
      <div
        style={{
          padding: '10px 16px 30px',
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Add attachment"
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--surface-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--lagoon-700)', flex: 'none', padding: 0,
          }}
        >
          <Icon name="plus" size={18} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          placeholder="Message the team…"
          style={{
            flex: 1,
            minWidth: 0,
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 999,
            padding: '9px 16px',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-body)',
            background: 'var(--foam-50)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={send}
          aria-label="Send"
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--lagoon-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--foam-50)', flex: 'none', padding: 0,
          }}
        >
          <Icon name="arrow-up" size={18} />
        </button>
      </div>
    </div>
  )
}
