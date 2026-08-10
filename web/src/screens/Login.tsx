import { useState } from 'react'
import { Wordmark, Button } from '../components/primitives'
import { useAuth } from '../lib/auth-context'
import { useAppConfig } from '../lib/queries'
import { auth as authApi } from '../lib/api'

// Email-first login: the user types their email and taps Continue; the app
// decides whether to sign them in or create their account — they never have to
// know which. (This removes the "must know to click Sign up" trap.)
type Step = 'email' | 'signin' | 'signup'

export function Login() {
  const { signIn, signUp, error } = useAuth()
  const config = useAppConfig()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const continueFromEmail = async () => {
    if (!emailValid || busy) return
    setBusy(true)
    setLocalErr(null)
    try {
      const { exists } = await authApi.accountExists(email.trim())
      setStep(exists ? 'signin' : 'signup')
    } catch {
      // If the check fails, fall back to sign-in (the safe default).
      setStep('signin')
    } finally {
      setBusy(false)
    }
  }

  const submitCreds = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (step === 'signup') await signUp(email.trim(), password, name.trim())
      else await signIn(email.trim(), password)
    } catch {
      // error is surfaced from the auth context
    } finally {
      setBusy(false)
    }
  }

  const passwordOk = step === 'signup' ? password.length >= 8 && name.trim().length > 0 : password.length > 0

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
          {step === 'email' && (
            <>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && continueFromEmail()}
                style={inputStyle}
              />
              <Button variant="primary" size="lg" fullWidth disabled={!emailValid || busy} onClick={continueFromEmail}>
                {busy ? 'Checking…' : 'Continue'}
              </Button>
            </>
          )}

          {step !== 'email' && (
            <>
              {/* Chosen email, editable */}
              <button
                type="button"
                onClick={() => { setStep('email'); setPassword(''); setName(''); setLocalErr(null) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-card)', padding: '12px 14px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-body)',
                }}
              >
                <span>{email.trim()}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>Change</span>
              </button>

              {step === 'signup' && (
                <>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                    Welcome! Let's create your account.
                  </div>
                  <input
                    type="text"
                    autoComplete="name"
                    autoFocus
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </>
              )}
              {step === 'signin' && (
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Welcome back.
                </div>
              )}

              <input
                type="password"
                autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                autoFocus={step === 'signin'}
                placeholder={step === 'signup' ? 'Choose a password (8+ characters)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && passwordOk && submitCreds()}
                style={inputStyle}
              />

              {(error || localErr) && (
                <div style={{ fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }}>
                  {localErr ?? error}
                </div>
              )}

              <Button variant="primary" size="lg" fullWidth disabled={!passwordOk || busy} onClick={submitCreds}>
                {busy ? 'Working…' : step === 'signup' ? 'Create account' : 'Sign in'}
              </Button>

              {step === 'signin' && (
                <button
                  type="button"
                  onClick={() => setStep('signup')}
                  style={linkStyle}
                >
                  Actually, I'm new here — create an account
                </button>
              )}
            </>
          )}

          {/* Demo world: role is matched by email at sign-up */}
          {step === 'email' && config.data?.demoMode && (
            <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.7, color: 'var(--stone-400)', textAlign: 'center' }}>
              Demo — use corey@zoomez.app (manager),
              <br />tyler@zoomez.app (staff), or sarah@example.com (customer)
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
  boxSizing: 'border-box',
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

const linkStyle: React.CSSProperties = {
  border: 0, background: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--lagoon-700)', textAlign: 'center',
  fontFamily: 'var(--font-body)',
}
