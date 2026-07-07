import { useState } from 'react'
import { Icon } from '../../components/Icon'

const SEGMENTS = 6

function PillIconCircle({ size, icon, iconSize }: { size: number; icon: 'x' | 'heart' | 'download'; iconSize: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: 'rgba(12,43,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={iconSize} />
    </div>
  )
}

function MoodChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'rgba(12,43,42,0.55)',
        borderRadius: 999,
        padding: '5px 14px',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

export function ReportCardStory({ onClose }: { onClose: () => void }) {
  // 0-based index of the active segment; design shows segment 2 of 6 active.
  const [active, setActive] = useState(1)

  const back = () => setActive((i) => Math.max(0, i - 1))
  const forward = () => setActive((i) => Math.min(SEGMENTS - 1, i + 1))

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, var(--lagoon-500) 0%, var(--lagoon-700) 55%, var(--lagoon-900) 100%)',
        fontFamily: 'var(--font-body)',
        color: 'var(--foam-50)',
        position: 'relative',
      }}
    >
      {/* Tap zones — left/right thirds rewind/advance */}
      <div
        onClick={back}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '33.33%', zIndex: 1 }}
      />
      <div
        onClick={forward}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '33.33%', zIndex: 1 }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 18px 28px', gap: 14 }}>
        {/* Progress segments */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= active ? 'var(--foam-50)' : 'rgba(247,245,238,0.35)',
              }}
            />
          ))}
        </div>

        {/* Header: dog pill + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(12,43,42,0.55)',
              borderRadius: 999,
              padding: '5px 14px 5px 5px',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: 'var(--seaglass-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--lagoon-700)',
              }}
            >
              <Icon name="dog" size={14} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Biscuit · {active + 1} of {SEGMENTS}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: 'rgba(12,43,42,0.55)',
              border: 0,
              cursor: 'pointer',
              color: 'var(--foam-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Photo placeholder */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(247,245,238,0.4)' }}>
          <Icon name="image" size={44} />
        </div>

        {/* Mood chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          <MoodChip>Playful</MoodChip>
          <MoodChip>Zoomies</MoodChip>
        </div>

        {/* Caption */}
        <div
          style={{
            background: 'rgba(12,43,42,0.55)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, lineHeight: 1.3 }}>
            Yard play with Luna, 10:15 AM
          </span>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <PillIconCircle size={44} icon="heart" iconSize={20} />
          <span style={{ fontSize: 12.5, color: 'rgba(247,245,238,0.7)' }}>Tap sides to flip · swipe down to close</span>
          <PillIconCircle size={44} icon="download" iconSize={20} />
        </div>
      </div>
    </div>
  )
}
