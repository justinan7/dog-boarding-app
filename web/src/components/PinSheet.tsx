import { useState } from 'react'
import { Sheet } from './primitives'
import { Icon } from './Icon'

// Manager view is PIN-gated (design: gold PIN lock badge on the Manager card)
// so a shared phone can't wander into approvals. Prototype PIN: 1234.
export function PinSheet({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean
  onClose: () => void
  onUnlock: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const press = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === '1234') {
        setPin('')
        onUnlock()
      } else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 600)
      }
    }
  }

  return (
    <Sheet open={open} onClose={() => { setPin(''); setError(false); onClose() }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '4px 0 8px' }}>
        <span
          style={{
            width: 44, height: 44, borderRadius: 999,
            background: 'var(--biscuit-200)', color: 'var(--biscuit-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="lock" size={20} />
        </span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
            Manager PIN
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
            Approvals and oversight are PIN-locked · demo PIN 1234
          </div>
        </div>

        {/* PIN dots */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: 14, height: 14, borderRadius: 999,
                background: error
                  ? 'var(--coral-500)'
                  : i < pin.length
                    ? 'var(--lagoon-700)'
                    : 'var(--stone-200)',
                transition: 'background var(--dur-fast) var(--ease-out)',
              }}
            />
          ))}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 10, justifyContent: 'center' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => (k === '⌫' ? setPin(pin.slice(0, -1)) : press(k))}
                style={{
                  height: 52, borderRadius: 999, border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-card)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 500,
                  color: 'var(--text-heading)',
                }}
              >
                {k}
              </button>
            ),
          )}
        </div>
      </div>
    </Sheet>
  )
}
