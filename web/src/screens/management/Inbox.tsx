import { Fragment, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Card } from '../../components/primitives'
import {
  useThreads, useThreadMessages, useSendMessage, useOversight, useReservations,
  type Thread, type Message,
} from '../../lib/queries'
import { AttachmentImgs } from '../customer/Messages'
import { fmtClock, fmtStamp } from '../../lib/format'
import { petLine } from '../../lib/stays'

function minsSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

// ---------------------------------------------------------------------------
function ThreadRow({
  thread,
  petNames,
  last,
  onOpen,
}: {
  thread: Thread
  petNames: string[]
  last?: boolean
  onOpen: () => void
}) {
  const unanswered = thread.flags?.includes('unanswered')
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 40, height: 40, borderRadius: 999, flex: 'none',
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={19} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>
            {thread.customerName}
            {thread.assignedStaffDisplay && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                {' '}↔ {thread.assignedStaffDisplay.split(' ')[0]}
              </span>
            )}
          </span>
          <span style={{ fontSize: 12, color: 'var(--stone-400)', flex: 'none' }}>
            {thread.lastMessageAt ? fmtClock(thread.lastMessageAt) : ''}
          </span>
        </div>
        <span
          style={{
            fontSize: 13, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {petNames.length > 0 ? `${petLine(petNames)} · ` : ''}{thread.lastBody ?? '—'}
        </span>
      </div>
      {unanswered && thread.lastMessageAt && (
        <Badge tone="error">{minsSince(thread.lastMessageAt)}m</Badge>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function ThreadDetail({ thread, petNames, onBack }: { thread: Thread; petNames: string[]; onBack: () => void }) {
  const messagesQ = useThreadMessages(thread.id)
  const send = useSendMessage(thread.id)
  const oversight = useOversight()
  const [takenOver, setTakenOver] = useState(false)
  const [armed, setArmed] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const messages: Message[] = messagesQ.data?.items ?? []
  const staffFirst = thread.assignedStaffDisplay?.split(' ')[0] ?? 'staff'
  const unanswered = thread.flags?.includes('unanswered') && thread.lastMessageAt

  const takeOver = () => {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 4000)
      return
    }
    setError(null)
    oversight.mutate(
      { threadId: thread.id, action: 'take_over' },
      {
        onSuccess: () => setTakenOver(true),
        onError: (e) => setError(e instanceof Error ? e.message : 'Take-over failed'),
      },
    )
  }

  const handBack = () => {
    oversight.mutate({ threadId: thread.id, action: 'hand_back' }, { onSuccess: () => setTakenOver(false) })
  }

  const doSend = () => {
    const text = draft.trim()
    if (!text || send.isPending) return
    send.mutate({ body: text }, { onSuccess: () => setDraft('') })
  }

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
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            {thread.customerName.split(' ')[0]} &amp; {staffFirst}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {petNames.length > 0 ? petLine(petNames) : 'conversation'}
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: takenOver ? 'var(--coral-200)' : 'var(--surface-tint)',
            color: takenOver ? '#A94E33' : 'var(--lagoon-700)',
            borderRadius: 999, padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
          }}
        >
          <Icon name={takenOver ? 'chevrons-right' : 'eye'} size={13} />
          {takenOver ? 'Taken over' : 'Watching'}
        </span>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!takenOver && (
          <div
            style={{
              alignSelf: 'center', textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)',
              background: 'var(--surface-tint)', borderRadius: 999, padding: '6px 12px',
            }}
          >
            Viewing silently · {staffFirst} can't see you · logged {fmtClock(new Date().toISOString())}
          </div>
        )}
        {messages.length > 0 && messages[0] && (
          <div style={{ alignSelf: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)' }}>
            {fmtStamp(messages[0].sentAt)}
          </div>
        )}
        {messages.map((m) =>
          m.senderRole === 'customer' ? (
            <Fragment key={m.id}>
              <AttachmentImgs message={m} align="flex-start" />
              {m.body && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)', paddingLeft: 6 }}>
                    {m.senderDisplay.split(' ')[0]}
                  </span>
                  <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px 16px 16px 4px', padding: '9px 14px', fontSize: 14, boxShadow: 'var(--shadow-card)' }}>
                    {m.body}
                  </div>
                </div>
              )}
            </Fragment>
          ) : (
            <Fragment key={m.id}>
              <AttachmentImgs message={m} align="flex-end" />
              {m.body && (
                <div style={{ alignSelf: 'flex-end', maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--stone-400)', paddingRight: 6 }}>
                    {m.senderRole === 'manager' ? 'Management' : staffFirst}
                  </span>
                  <div style={{ background: 'var(--lagoon-700)', color: 'var(--foam-50)', borderRadius: '16px 16px 4px 16px', padding: '9px 14px', fontSize: 14 }}>
                    {m.body}
                  </div>
                </div>
              )}
            </Fragment>
          ),
        )}
        {unanswered && thread.lastMessageAt && (
          <div style={{ alignSelf: 'center', fontSize: 11.5, color: 'var(--red-error)', fontWeight: 600 }}>
            Unanswered {minsSince(thread.lastMessageAt)}m
            {thread.slaDueAt ? ` · SLA ${new Date(thread.slaDueAt) < new Date() ? 'breached' : `breach at ${fmtClock(thread.slaDueAt)}`}` : ''}
          </div>
        )}
      </div>

      {/* Footer: take-over pill OR reply-as-management composer */}
      <div style={{ padding: '12px 16px 30px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--red-error)' }}>{error}</div>}
        {!takenOver ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              Take over to reply as Zoomez management — {staffFirst} is muted and notified
            </div>
            <button
              type="button"
              onClick={takeOver}
              disabled={oversight.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                border: armed ? '2px solid var(--coral-500)' : '2px solid var(--lagoon-700)',
                background: 'none', cursor: 'pointer',
                borderRadius: 999, padding: '5px 5px 5px 6px', fontFamily: 'var(--font-body)',
              }}
            >
              <span
                style={{
                  width: 34, height: 34, borderRadius: 999, flex: 'none',
                  background: 'var(--coral-500)', color: 'var(--foam-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="chevrons-right" size={18} />
              </span>
              <span style={{ flex: 1, fontSize: 14, color: armed ? 'var(--coral-500)' : 'var(--text-muted)', textAlign: 'left', fontWeight: armed ? 600 : 400 }}>
                {oversight.isPending ? 'Taking over…' : armed ? 'Tap again to confirm take-over' : 'Take over the thread'}
              </span>
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSend() }}
                placeholder="Reply as Zoomez management…"
                style={{
                  flex: 1, minWidth: 0, border: '1.5px solid var(--border-subtle)', borderRadius: 999,
                  padding: '9px 16px', fontSize: 14, fontFamily: 'var(--font-body)',
                  color: 'var(--text-body)', background: 'var(--foam-50)', outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={doSend}
                aria-label="Send"
                disabled={send.isPending}
                style={{
                  width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
                  background: 'var(--lagoon-700)', color: 'var(--foam-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0,
                  opacity: send.isPending ? 0.5 : 1,
                }}
              >
                <Icon name="arrow-up" size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={handBack}
              disabled={oversight.isPending}
              style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)', fontFamily: 'var(--font-body)' }}
            >
              Hand the thread back to {staffFirst}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function Inbox({ onBack }: { onBack: () => void }) {
  const threadsQ = useThreads()
  const reservationsQ = useReservations()
  const [openId, setOpenId] = useState<string | null>(null)

  const threads = threadsQ.data?.items ?? []
  const petsFor = (t: Thread): string[] =>
    t.reservationId
      ? (reservationsQ.data?.items ?? []).find((r) => r.id === t.reservationId)?.petNames ?? []
      : []

  const open = threads.find((t) => t.id === openId)
  if (open) {
    return <ThreadDetail thread={open} petNames={petsFor(open)} onBack={() => setOpenId(null)} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>Inbox</span>
      </div>
      <div className="z-phone__scroll" style={{ padding: '14px 20px', flex: 1 }}>
        <Card style={{ padding: '4px 16px' }}>
          {threads.map((t, i) => (
            <ThreadRow key={t.id} thread={t} petNames={petsFor(t)} last={i === threads.length - 1} onOpen={() => setOpenId(t.id)} />
          ))}
          {threads.length === 0 && !threadsQ.isLoading && (
            <div style={{ padding: '13px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>No conversations yet.</div>
          )}
        </Card>
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
          Opening a thread is a silent view — it's audit-logged, staff can't see you.
        </div>
      </div>
    </div>
  )
}
