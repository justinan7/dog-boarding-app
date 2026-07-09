import { useState } from 'react'
import { Wordmark, Button } from '../components/primitives'
import { useAuth } from '../lib/auth-context'
import { useAppConfig } from '../lib/queries'

export function Login() {
  const { signIn, signUp, error } = useAuth()
  const config = useAppConfig()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, name)
      } else {
        await signIn(email, password)
      }
    } catch {
      // error is set in auth context
    } finally {
      setBusy(false)
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
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px 40px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Wordmark size={42} />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            Five-star stays for four-legged guests
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }}>
              {error}
              {mode === 'signin' && (
                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  First time here? Accounts are created at <b>sign-up</b> — tap "Sign up" below.
                </div>
              )}
            </div>
          )}

          <Button variant="primary" size="lg" fullWidth onClick={submit}>
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{
              border: 0, background: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--lagoon-700)', textAlign: 'center',
              fontFamily: 'var(--font-body)',
            }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>

          {/* Demo world: role is matched by email at sign-UP (any 8+ char password) */}
          {config.data?.demoMode && (
            <div
              style={{
                marginTop: 8,
                background: 'var(--surface-tint)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 11.5,
                lineHeight: 1.7,
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10 }}>
                Demo — sign up as
              </span>
              <br />
              <b>corey@zoomez.app</b> → manager · <b>tyler@zoomez.app</b> → staff
              <br />
              <b>sarah@example.com</b> → customer with dogs &amp; a stay
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 34px', fontSize: 11, color: 'var(--stone-400)' }}>
        Zoomez · San Diego
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  fontFamily: 'var(--font-body)',
  border: '1.5px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-card)',
  color: 'var(--text-body)',
  outline: 'none',
  boxShadow: 'var(--shadow-inset)',
}
