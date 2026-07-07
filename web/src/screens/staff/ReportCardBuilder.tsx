import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Button, Section } from '../../components/primitives'

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

/* ---------- Photo tile (placeholder art per the design) ---------- */
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

export function ReportCardBuilder({ onBack }: { onBack: () => void }) {
  const [mood, setMood] = useState('Playful')
  const [appetite, setAppetite] = useState('Ate everything')
  const [moment, setMoment] = useState('Made a new friend with Luna at the fence — total zoomies.')
  const [sent, setSent] = useState(false)

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
            Biscuit's card
          </span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sat</span>
      </div>

      {/* Photos */}
      <Section label="Photos · tap to add, drag to reorder">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <PhotoTile icon="sun" bg="var(--seaglass-200)" />
          <PhotoTile icon="waves" bg="var(--seaglass-100)" />
          <PhotoTile icon="bone" bg="var(--seaglass-200)" />
          <div
            style={{
              aspectRatio: '1',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--stone-400)',
            }}
          >
            <Icon name="plus" size={20} />
          </div>
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
        <Icon name="check" size={16} style={{ color: 'var(--green-success)' }} />
        Care log auto-added: Breakfast 6:04a · Walk 10a
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="md" style={{ flex: 1 }}>
          Save draft
        </Button>
        {sent ? (
          <Button variant="primary" size="md" disabled style={{ flex: 1 }}>
            Sent ✓
          </Button>
        ) : (
          <Button variant="primary" size="md" icon="send" style={{ flex: 1 }} onClick={() => setSent(true)}>
            Send to owner
          </Button>
        )}
      </div>
    </>
  )
}
