import type { CSSProperties, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/* ---------- Wordmark — typographic only ("Zoomez" italic serif + gold period) ---------- */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: size,
        lineHeight: 1,
        color: 'var(--text-heading)',
      }}
    >
      Zoomez<span style={{ color: 'var(--accent-gold)' }}>.</span>
    </span>
  )
}

/* ---------- Eyebrow label ---------- */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="z-eyebrow" style={color ? { color } : undefined}>
      {children}
    </span>
  )
}

/* ---------- Button (mirrors the DS Button variants/sizes) ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'gold'
type Size = 'sm' | 'md' | 'lg'
const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 }

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  disabled = false,
  fullWidth = false,
  onClick,
  style,
}: {
  children: ReactNode
  variant?: Variant
  size?: Size
  icon?: IconName
  iconAfter?: IconName
  disabled?: boolean
  fullWidth?: boolean
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button
      className={`z-btn z-btn--${size} z-btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
      style={{ width: fullWidth ? '100%' : undefined, ...style }}
    >
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={ICON_SIZE[size]} />}
    </button>
  )
}

/* ---------- Badge (exact tones from the DS bundle) ---------- */
type Tone = 'lagoon' | 'gold' | 'coral' | 'neutral' | 'success' | 'error' | 'inverse'
const TONES: Record<Tone, { background: string; color: string }> = {
  lagoon: { background: 'var(--surface-tint)', color: 'var(--lagoon-700)' },
  gold: { background: 'var(--biscuit-200)', color: 'var(--biscuit-700)' },
  coral: { background: 'var(--coral-200)', color: '#A94E33' },
  neutral: { background: 'var(--stone-100)', color: 'var(--stone-600)' },
  success: { background: '#DCEEE4', color: 'var(--green-success)' },
  error: { background: '#F5DDD9', color: 'var(--red-error)' },
  inverse: { background: 'var(--lagoon-900)', color: 'var(--foam-50)' },
}
export function Badge({
  children,
  tone = 'lagoon',
  icon,
}: {
  children: ReactNode
  tone?: Tone
  icon?: IconName
}) {
  const t = TONES[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        padding: '5px 11px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...t,
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}

/* ---------- Card ---------- */
export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode
  style?: CSSProperties
  /** coral = the 1.5px overdue/alert border */
  accent?: 'coral'
}) {
  return (
    <div
      className="z-card"
      style={{
        border: accent === 'coral' ? '1.5px solid var(--coral-500)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ---------- Dog avatar (seaglass circle + dog glyph; swap for photo later) ---------- */
export function DogAvatar({ size = 40, tone = 'seaglass' }: { size?: number; tone?: 'seaglass' | 'coral' }) {
  const bg = tone === 'coral' ? 'var(--coral-200)' : 'var(--seaglass-200)'
  const fg = tone === 'coral' ? '#A94E33' : 'var(--lagoon-500)'
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 999,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="dog" size={Math.round(size * 0.5)} />
    </span>
  )
}

/* ---------- Chip (in-residence dogs, approval-count pills, etc.) ---------- */
export function Chip({
  children,
  tone = 'lagoon',
  leading,
  style,
}: {
  children: ReactNode
  tone?: 'lagoon' | 'gold' | 'coral'
  leading?: ReactNode
  style?: CSSProperties
}) {
  const map = {
    lagoon: { background: 'var(--surface-tint)', color: 'var(--lagoon-700)' },
    gold: { background: 'var(--biscuit-200)', color: 'var(--biscuit-700)' },
    coral: { background: 'var(--coral-200)', color: '#A94E33' },
  } as const
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: leading ? '5px 12px 5px 5px' : '6px 13px',
        fontSize: 13,
        fontWeight: leading ? 500 : 600,
        ...map[tone],
        ...style,
      }}
    >
      {leading}
      {children}
    </span>
  )
}

/* ---------- Section (eyebrow + content stack) ---------- */
export function Section({
  label,
  labelColor,
  children,
}: {
  label: ReactNode
  labelColor?: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Eyebrow color={labelColor}>{label}</Eyebrow>
      {children}
    </div>
  )
}
