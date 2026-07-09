import { Fragment, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Card } from '../../components/primitives'
import {
  useThreads, useThreadMessages, useSendMessage, useReservations,
  type Thread, type Message,
} from '../../lib/queries'
import { uploadMedia, pickFile } from '../../lib/upload'
import { AttachmentImgs } from '../customer/Messages'
import { fmtClock, fmtStamp } from '../../lib/format'
import { petLine } from '../../lib/stays'

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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
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
            {petNames.length > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {petLine(petNames)}</span>
            )}
          </span>
          <span style={{ fontSize: 12, color: 'var(--stone-400)', flex: 'none' }}>
            {thread.lastMessageAt ? fmtClock(thread.lastMessageAt) : ''}
          </span>
        </div>
        <span
          style={{
            fontSize: 13, color: unanswered ? 'var(--text-body)' : 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontWeight: unanswered ? 500 : 400,
          }}
        >
          {thread.lastBody ?? '—'}
        </span>
      </div>
      {unanswered && <Badge tone="gold">Reply due</Badge>}
    </div>
  )
}

function ThreadView({ thread, petNames, onBack }: { thread: Thread; petNames: string[]; onBack: () => void }) {
  const messagesQ = useThreadMessages(thread.id)
  const send = useSendMessage(thread.id)
  const [draft, setDraft] = useState('')

  const messages: Message[] = messagesQ.data?.items ?? []
  const [uploading, setUploading] = useState(false)

  const doSend = () => {
    const text = draft.trim()
    if (!text || send.isPending) return
    send.mutate({ body: text }, { onSuccess: () => setDraft('') })
  }

  const attachPhoto = async () => {
    if (uploading) return
    const file = await pickFile('image/*')
    if (!file) return
    setUploading(true)
    try {
      const { objectKey } = await uploadMedia(file, 'photo')
      send.mutate({ attachmentKeys: [objectKey] })
    } finally {
      setUploading(false)
    }
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
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            {thread.customerName}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {petNames.length > 0 ? `${petLine(petNames)} · ` : ''}sent as Zoomez concierge
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length > 0 && messages[0] && (
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--stone-400)' }}>
            {fmtStamp(messages[0].sentAt)}
          </div>
        )}
        {messages.map((m) =>
          m.senderRole === 'customer' ? (
            <Fragment key={m.id}>
              <AttachmentImgs message={m} align="flex-start" />
              {m.body && (
                <div style={{ alignSelf: 'flex-start', maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              )}
            </Fragment>
          ) : (
            <Fragment key={m.id}>
              <AttachmentImgs message={m} align="flex-end" />
              {m.body && (
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
                  {m.body}
                </div>
              )}
            </Fragment>
          ),
        )}
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
          aria-label="Add photo"
          onClick={() => void attachPhoto()}
          disabled={uploading}
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--surface-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--lagoon-700)', flex: 'none', padding: 0,
            opacity: uploading ? 0.5 : 1,
          }}
        >
          <Icon name={uploading ? 'image' : 'plus'} size={18} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') doSend()
          }}
          placeholder={`Reply to ${thread.customerName.split(' ')[0]}…`}
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
          disabled={send.isPending}
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--lagoon-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--foam-50)', flex: 'none', padding: 0,
            opacity: send.isPending ? 0.5 : 1,
          }}
        >
          <Icon name="arrow-up" size={18} />
        </button>
      </div>
    </div>
  )
}

export function StaffMessages() {
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
    return <ThreadView thread={open} petNames={petsFor(open)} onBack={() => setOpenId(null)} />
  }

  // Rendered full-height (FullWithTabs) so the thread view can own the frame;
  // the list carries the standard screen padding itself.
  return (
    <div
      className="z-phone__scroll"
      style={{ padding: '64px 20px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Messages</span>
      <Card style={{ padding: '4px 16px' }}>
        {threads.map((t, i) => (
          <ThreadRow
            key={t.id}
            thread={t}
            petNames={petsFor(t)}
            last={i === threads.length - 1}
            onOpen={() => setOpenId(t.id)}
          />
        ))}
        {threads.length === 0 && !threadsQ.isLoading && (
          <div style={{ padding: '13px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
            No customer threads yet.
          </div>
        )}
      </Card>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
        Replies send as Zoomez concierge — management can view or take over any thread.
      </div>
    </div>
  )
}
