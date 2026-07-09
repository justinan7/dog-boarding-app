import { Fragment, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useThreads, useThreadMessages, useSendMessage, useReservations, type Message } from '../../lib/queries'
import { fmtDateRange, fmtStamp, fmtClock } from '../../lib/format'
import { petLine } from '../../lib/stays'

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
  const threads = useThreads()
  const thread = threads.data?.items[0] ?? null
  const messagesQ = useThreadMessages(thread?.id ?? null)
  const send = useSendMessage(thread?.id ?? null)
  const reservations = useReservations()
  const [draft, setDraft] = useState('')

  const stay = thread?.reservationId
    ? (reservations.data?.items ?? []).find((r) => r.id === thread.reservationId)
    : undefined

  const messages: Message[] = messagesQ.data?.items ?? []
  const lastOwnRead = [...messages].reverse().find((m) => m.senderRole === 'customer' && m.readAt)

  const doSend = () => {
    const text = draft.trim()
    if (!text || !thread || send.isPending) return
    send.mutate(text, { onSuccess: () => setDraft('') })
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
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {stay ? `${petLine(stay.petNames)} · ${fmtDateRange(stay.startDate, stay.endDate)}` : 'Your Zoomez team'}
          </span>
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
        {!thread && !threads.isLoading && (
          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', padding: '40px 20px' }}>
            No conversation yet — the team opens your thread when a stay is booked.
          </div>
        )}
        {messages.length > 0 && messages[0] && (
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--stone-400)' }}>
            {fmtStamp(messages[0].sentAt)}
          </div>
        )}
        {messages.map((m) => {
          if (m.senderRole === 'customer') {
            return (
              <Fragment key={m.id}>
                <OwnBubble text={m.body ?? ''} />
                {lastOwnRead?.id === m.id && m.readAt && (
                  <div style={{ alignSelf: 'flex-end', fontSize: 11.5, color: 'var(--stone-400)' }}>
                    Read {fmtClock(m.readAt)}
                  </div>
                )}
              </Fragment>
            )
          }
          return (
            <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)', paddingLeft: 6 }}>{m.senderDisplay}</span>
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
                {m.body}
              </div>
            </div>
          )
        })}
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
            if (e.key === 'Enter') doSend()
          }}
          placeholder={thread ? 'Message the team…' : 'No thread yet'}
          disabled={!thread}
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
          onClick={doSend}
          aria-label="Send"
          disabled={!thread || send.isPending}
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--lagoon-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--foam-50)', flex: 'none', padding: 0,
            opacity: !thread || send.isPending ? 0.5 : 1,
          }}
        >
          <Icon name="arrow-up" size={18} />
        </button>
      </div>
    </div>
  )
}
