import { useEffect, useState } from 'react'
import { Button } from './primitives'
import { useAppConfig } from '../lib/queries'
import { enablePush, isPushEnabled, pushSupported } from '../lib/push-client'

/** "Enable notifications" button — med alerts + messages via web push. */
export function PushToggle() {
  const config = useAppConfig()
  const [state, setState] = useState<'off' | 'on' | 'busy'>('off')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void isPushEnabled().then((on) => setState(on ? 'on' : 'off'))
  }, [])

  if (!pushSupported() && !/iPhone|iPad/.test(navigator.userAgent)) return null

  const enable = async () => {
    const key = config.data?.vapidPublicKey
    if (!key) {
      setError('Notifications are not configured on this server yet.')
      return
    }
    setState('busy')
    setError(null)
    try {
      await enablePush(key)
      setState('on')
    } catch (e) {
      setState('off')
      setError(e instanceof Error ? e.message : 'Could not enable notifications.')
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        fullWidth
        icon="bell"
        disabled={state !== 'off'}
        onClick={() => void enable()}
      >
        {state === 'on' ? 'Notifications on' : state === 'busy' ? 'Enabling…' : 'Enable notifications'}
      </Button>
      {error && (
        <div style={{ fontSize: 12.5, color: 'var(--biscuit-700)', background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
          {error}
        </div>
      )}
    </>
  )
}
