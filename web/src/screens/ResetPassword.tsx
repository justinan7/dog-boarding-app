import { useState } from 'react'
import { Wordmark, Button } from '../components/primitives'
import { auth as authApi } from '../lib/api'

// Landing for the emailed reset link: PWA opened at /?reset=<token>. Sets a new
// password, then hands off to normal login. Clears the token from the URL.
export function ResetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const ok = password.length >= 8 && password === confirm

  const submit = async () => {
    if (!ok || busy) return
    setBusy(true); setErr(null)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'This reset link is invalid or has expired.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', fontFamily: 'var(--font-body)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px 40px', gap: 24 }}>
        <Wordmark size={42} />
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {done ? (
            <>
              <div style={{ fontSize: 15, color: 'var(--text-heading)', textAlign: 'center', fontWeight: 600 }}>
                Password updated
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                You can sign in with your new password now.
              </div>
              <Button variant="primary" size="lg" fullWidth onClick={onDone}>Sign in</Button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', textAlign: 'center' }}>
                Choose a new password
              </div>
              <input type="password" autoComplete="new-password" autoFocus placeholder="New password (8+ characters)"
                value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
              <input type="password" autoComplete="new-password" placeholder="Confirm new password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()} style={inputStyle} />
              {password && confirm && password !== confirm && (
                <div style={{ fontSize: 12.5, color: 'var(--red-error)', textAlign: 'center' }}>Passwords don't match.</div>
              )}
              {err && <div style={{ fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }}>{err}</div>}
              <Button variant="primary" size="lg" fullWidth disabled={!ok || busy} onClick={submit}>
                {busy ? 'Updating…' : 'Update password'}
              </Button>
              <button type="button" onClick={onDone} style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--lagoon-700)', fontFamily: 'var(--font-body)' }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '16px 0 34px', fontSize: 11, color: 'var(--stone-400)' }}>Zoomez · San Diego</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', fontSize: 16,
  fontFamily: 'var(--font-body)', border: '1.5px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface-card)',
  color: 'var(--text-body)', outline: 'none', boxShadow: 'var(--shadow-inset)',
}
