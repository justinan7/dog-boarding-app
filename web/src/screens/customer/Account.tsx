import { useEffect, useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Card } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useAppConfig } from '../../lib/queries'
import { enablePush, isPushEnabled, pushSupported } from '../../lib/push-client'

// Account tab — not part of the hi-fi screen set. Per the design README,
// customers get Profile / Payments / Sign out (no role switch). Kept to the
// management "More" menu idiom until a hi-fi lands.
function Row({ icon, label, last, onClick }: { icon: IconName; label: string; last?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', border: 0, background: 'none', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--surface-tint)', color: 'var(--lagoon-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-heading)' }}>{label}</span>
      <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-400)' }} />
    </button>
  )
}

import type { Role } from '../../lib/nav'

export function CustomerAccount({ viewAs }: { viewAs?: (r: Role) => void }) {
  const { user, signOut } = useAuth()
  const config = useAppConfig()
  const [pushState, setPushState] = useState<'off' | 'on' | 'busy' | 'error'>('off')
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    void isPushEnabled().then((on) => setPushState(on ? 'on' : 'off'))
  }, [])

  const togglePush = async () => {
    if (pushState === 'on' || pushState === 'busy') return
    const key = config.data?.vapidPublicKey
    if (!key) {
      setPushError('Notifications are not configured on this server yet.')
      return
    }
    setPushState('busy')
    setPushError(null)
    try {
      await enablePush(key)
      setPushState('on')
    } catch (e) {
      setPushState('error')
      setPushError(e instanceof Error ? e.message : 'Could not enable notifications.')
    }
  }

  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Account</span>

      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--seaglass-200)', color: 'var(--lagoon-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="user-round" size={22} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{user?.name ?? '—'}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{user?.email ?? ''}</span>
        </div>
      </Card>

      <Card style={{ padding: '4px 16px' }}>
        <Row
          icon="bell"
          label={
            pushState === 'on' ? 'Notifications · on'
              : pushState === 'busy' ? 'Enabling notifications…'
                : pushSupported() ? 'Enable notifications' : 'Notifications'
          }
          onClick={() => void togglePush()}
        />
        <Row icon="log-out" label="Sign out" last onClick={() => void signOut()} />
      </Card>
      {pushError && (
        <div style={{ fontSize: 12.5, color: 'var(--biscuit-700)', background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
          {pushError}
        </div>
      )}

      {/* Demo mode only: hop between the three role views to explore the app. */}
      {config.data?.demoMode && viewAs && (
        <>
          <span className="z-eyebrow">Demo · view as</span>
          <Card style={{ padding: '4px 16px' }}>
            <Row icon="paw-print" label="Staff view" onClick={() => viewAs('staff')} />
            <Row icon="eye" label="Manager view" last onClick={() => viewAs('manager')} />
          </Card>
        </>
      )}
    </>
  )
}
