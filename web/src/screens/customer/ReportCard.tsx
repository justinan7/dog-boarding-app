import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Badge, Button } from '../../components/primitives'

function PhotoTile({
  icon,
  bg,
  onClick,
  children,
}: {
  icon: IconName
  bg: string
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '4 / 3.4',
        borderRadius: 'var(--radius-xl)',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: 'var(--lagoon-300)',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={26} />
      {children}
    </div>
  )
}

export function ReportCardPostcard({
  go,
  onBack,
}: {
  go: (r: 'story' | 'messages') => void
  onBack: () => void
}) {
  const [hearted, setHearted] = useState(false)

  return (
    <>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>
            Biscuit's day
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Friday, Jul 4 · Day 1 of 2</span>
        </div>
      </div>

      {/* Postcard note */}
      <div
        style={{
          background: 'var(--surface-inverse)',
          borderRadius: 'var(--radius-xl)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--accent-gold)',
          }}
        >
          From Brette at Zoomez
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 21, lineHeight: 1.3, color: 'var(--text-inverse)',
          }}
        >
          "Biscuit made a friend today — he and Bella napped in the sunny spot after a morning of zoomies."
        </span>
        <span style={{ fontSize: 14, color: 'var(--seaglass-200)' }}>— Brette</span>
      </div>

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <PhotoTile icon="sun" bg="var(--seaglass-100)" onClick={() => go('story')} />
        <PhotoTile icon="waves" bg="var(--seaglass-200)" onClick={() => go('story')} />
        <PhotoTile icon="bone" bg="var(--seaglass-200)" onClick={() => go('story')} />
        <PhotoTile icon="heart" bg="var(--seaglass-100)" onClick={() => go('story')}>
          <span
            style={{
              position: 'absolute', right: 12, bottom: 10,
              background: 'var(--lagoon-900)', color: 'var(--foam-50)',
              borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
            }}
          >
            +2
          </span>
        </PhotoTile>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Tap any photo for the full story
      </div>

      {/* Day badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone="lagoon">Playful</Badge>
        <Badge tone="lagoon">Ate everything</Badge>
        <Badge tone="lagoon">Three walks</Badge>
      </div>

      {/* Care log */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-body)' }}>
          <Icon name="clipboard-check" size={17} style={{ color: 'var(--green-success)' }} />
          Care log · 4 of 4 complete
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>Details</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          variant="secondary"
          size="md"
          icon="heart"
          style={{ flex: 1 }}
          onClick={() => setHearted((h) => !h)}
        >
          {hearted ? 'Hearted' : 'Heart'}
        </Button>
        <Button variant="primary" size="md" icon="message-circle" style={{ flex: 1 }} onClick={() => go('messages')}>
          Reply
        </Button>
      </div>
    </>
  )
}
