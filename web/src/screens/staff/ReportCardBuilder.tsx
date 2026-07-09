import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Button, Section } from '../../components/primitives'
import { useCareTasks, usePetDetail, useReservations, useCreateReportCard } from '../../lib/queries'
import { uploadMedia, mediaUrl, pickFile, type UploadedMedia } from '../../lib/upload'
import { seedToday } from '../../lib/roster'
import { fmtWeekday, fmtTimeCompact } from '../../lib/format'

/* ---------- Tag (local — matches DS Tag: selectable pill chip) ---------- */
function Tag({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 13.5,
        fontWeight: 600,
        padding: '8px 15px',
        borderRadius: 999,
        background: selected ? 'var(--lagoon-700)' : 'var(--surface-card)',
        color: selected ? 'var(--foam-50)' : 'var(--text-heading)',
        border: selected ? '1px solid var(--lagoon-700)' : '1px solid var(--border-subtle)',
        transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      {children}
    </button>
  )
}

/* ---------- Photo tile (placeholder art until uploads land) ---------- */
function PhotoTile({ icon, bg }: { icon: IconName; bg: string }) {
  return (
    <div
      style={{
        aspectRatio: '1',
        borderRadius: 'var(--radius-md)',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--lagoon-300)',
      }}
    >
      <Icon name={icon} size={18} />
    </div>
  )
}

const MOODS = ['Sleepy', 'Calm', 'Playful', 'Anxious']
const APPETITES = ['Ate everything', 'Some', 'None']

export function ReportCardBuilder({ petId, onBack }: { petId: string | null; onBack: () => void }) {
  const detail = usePetDetail(petId)
  const allTasks = useCareTasks({})
  const reservationsQ = useReservations()
  const create = useCreateReportCard()

  const [mood, setMood] = useState('Playful')
  const [appetite, setAppetite] = useState('Ate everything')
  const [moment, setMoment] = useState('')
  const [saved, setSaved] = useState<'draft' | 'sent' | null>(null)
  const [photos, setPhotos] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)

  const addPhoto = async () => {
    if (uploading) return
    const file = await pickFile('image/*')
    if (!file) return
    setUploading(true)
    try {
      const up = await uploadMedia(file, 'photo')
      setPhotos((p) => [...p, up])
    } finally {
      setUploading(false)
    }
  }

  const pet = detail.data
  const today = seedToday(allTasks.data?.items)
  const reservation = (reservationsQ.data?.items ?? []).find(
    (r) => r.pets.some((p) => p.id === petId) && r.status !== 'cancelled' && r.status !== 'denied',
  )

  // The day's completed tasks become the auto care log line.
  const doneToday = (allTasks.data?.items ?? [])
    .filter((t) => t.petId === petId && t.scheduledDate === today && t.state === 'done')
    .sort((a, b) => a.scheduledLocalTime.localeCompare(b.scheduledLocalTime))
  const careLogLine = doneToday.map((t) => `${t.label} ${fmtTimeCompact(t.scheduledLocalTime)}`).join(' · ')

  const submit = (send: boolean) => {
    if (!petId || !reservation || create.isPending || saved === 'sent') return
    create.mutate(
      {
        draft: {
          reservationId: reservation.id,
          petId,
          date: today,
          mood,
          appetite,
          bestMoment: moment.trim() || undefined,
          photoKeys: photos.map((p) => p.objectKey),
        },
        send,
      },
      { onSuccess: () => setSaved(send ? 'sent' : 'draft') },
    )
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 999, flex: 'none',
              background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="dog" size={18} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>
            {pet?.name ?? '…'}'s card
          </span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmtWeekday(today).slice(0, 3)}</span>
      </div>

      {/* Photos */}
      <Section label={photos.length > 0 ? `Photos · ${photos.length} added` : 'Photos · tap + to add'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {photos.map((p) => (
            <div
              key={p.objectKey}
              onClick={() => setPhotos((all) => all.filter((x) => x.objectKey !== p.objectKey))}
              title="Tap to remove"
              style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img
                src={mediaUrl(p.thumbKey ?? p.objectKey)}
                alt="Report card photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
          {photos.length === 0 && <PhotoTile icon="sun" bg="var(--seaglass-200)" />}
          <button
            type="button"
            onClick={() => void addPhoto()}
            disabled={uploading}
            aria-label="Add photo"
            style={{
              aspectRatio: '1',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--border-strong)',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--stone-400)',
              cursor: 'pointer',
              opacity: uploading ? 0.5 : 1,
            }}
          >
            <Icon name={uploading ? 'image' : 'plus'} size={20} />
          </button>
        </div>
      </Section>

      {/* Mood */}
      <Section label="Mood today">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MOODS.map((m) => (
            <Tag key={m} selected={mood === m} onClick={() => setMood(m)}>
              {m}
            </Tag>
          ))}
        </div>
      </Section>

      {/* Appetite */}
      <Section label="Appetite">
        <div style={{ display: 'flex', gap: 8 }}>
          {APPETITES.map((a) => (
            <Tag key={a} selected={appetite === a} onClick={() => setAppetite(a)}>
              {a}
            </Tag>
          ))}
        </div>
      </Section>

      {/* Best moment (DS Input: label + value in a bordered field) */}
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Best moment
        </span>
        <textarea
          value={moment}
          onChange={(e) => setMoment(e.target.value)}
          rows={2}
          placeholder={`What made ${pet?.name ?? 'their'} day?`}
          style={{
            border: 0,
            outline: 'none',
            background: 'none',
            padding: 0,
            resize: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            lineHeight: 1.4,
            color: 'var(--text-heading)',
          }}
        />
      </label>

      {/* Care log strip */}
      {careLogLine && (
        <div
          style={{
            background: 'var(--surface-tint)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--text-body)',
          }}
        >
          <Icon name="check" size={16} style={{ color: 'var(--green-success)', flex: 'none' }} />
          Care log auto-added: {careLogLine}
        </div>
      )}

      {create.isError && (
        <div style={{ fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }}>
          {create.error instanceof Error ? create.error.message : 'Something went wrong.'}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          disabled={!reservation || create.isPending || saved === 'sent'}
          onClick={() => submit(false)}
        >
          {saved === 'draft' ? 'Draft saved ✓' : 'Save draft'}
        </Button>
        {saved === 'sent' ? (
          <Button variant="primary" size="md" disabled style={{ flex: 1 }}>
            Sent ✓
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            icon="send"
            style={{ flex: 1 }}
            disabled={!reservation || create.isPending}
            onClick={() => submit(true)}
          >
            {create.isPending ? 'Sending…' : 'Send to owner'}
          </Button>
        )}
      </div>
    </>
  )
}
