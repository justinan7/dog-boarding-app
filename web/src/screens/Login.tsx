import { useState } from 'react'
import { Wordmark, Button } from '../components/primitives'
import { useAuth } from '../lib/auth-context'
import { useAppConfig } from '../lib/queries'
import { auth as authApi } from '../lib/api'

// Email-first login: type email → the app decides sign-in vs create-account.
// A two-factor step and a forgot-password path branch off the sign-in step.
type Step = 'email' | 'signin' | 'signup' | 'totp' | 'forgot' | 'forgot-sent'

export function Login() {
  const { signIn, signUp, verifyTwoFactor, error } = useAuth()
  const config = useAppConfig()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const continueFromEmail = async () => {
    if (!emailValid || busy) return
    setBusy(true); setLocalErr(null)
    try {
      const { exists } = await authApi.accountExists(email.trim())
      setStep(exists ? 'signin' : 'signup')
    } catch {
      setStep('signin')
    } finally {
      setBusy(false)
    }
  }

  const submitCreds = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (step === 'signup') {
        await signUp(email.trim(), password, name.trim())
      } else {
        const twoFactor = await signIn(email.trim(), password)
        if (twoFactor) setStep('totp')
      }
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false)
    }
  }

  const submitTotp = async () => {
    if (code.trim().length < 6 || busy) return
    setBusy(true)
    try {
      await verifyTwoFactor(code.trim())
    } catch {
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const sendReset = async () => {
    if (!emailValid || busy) return
    setBusy(true); setLocalErr(null)
    try {
      await authApi.requestPasswordReset(email.trim())
    } catch {
      // Always show success (don't leak whether the email exists).
    } finally {
      setBusy(false)
      setStep('forgot-sent')
    }
  }

  const passwordOk = step === 'signup' ? password.length >= 8 && name.trim().length > 0 : password.length > 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', fontFamily: 'var(--font-body)' }}>
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
              <input type="email" inputMode="email" autoComplete="email" autoFocus placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && continueFromEmail()} style={inputStyle} />
              <Button variant="primary" size="lg" fullWidth disabled={!emailValid || busy} onClick={continueFromEmail}>
                {busy ? 'Checking…' : 'Continue'}
              </Button>
            </>
          )}

          {(step === 'signin' || step === 'signup') && (
            <>
              <EmailChip email={email.trim()} onChange={() => { setStep('email'); setPassword(''); setName(''); setLocalErr(null) }} />
              {step === 'signup' && (
                <>
                  <div style={hintStyle}>Welcome! Let's create your account.</div>
                  <input type="text" autoComplete="name" autoFocus placeholder="Your name"
                    value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                </>
              )}
              {step === 'signin' && <div style={hintStyle}>Welcome back.</div>}
              <input type="password" autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                autoFocus={step === 'signin'}
                placeholder={step === 'signup' ? 'Choose a password (8+ characters)' : 'Password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && passwordOk && submitCreds()} style={inputStyle} />
              {(error || localErr) && <div style={errStyle}>{localErr ?? error}</div>}
              <Button variant="primary" size="lg" fullWidth disabled={!passwordOk || busy} onClick={submitCreds}>
                {busy ? 'Working…' : step === 'signup' ? 'Create account' : 'Sign in'}
              </Button>
              {step === 'signin' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setStep('forgot')} style={linkStyle}>Forgot password?</button>
                  <button type="button" onClick={() => setStep('signup')} style={linkStyle}>I'm new here</button>
                </div>
              )}
            </>
          )}

          {step === 'totp' && (
            <>
              <div style={hintStyle}>Enter the 6-digit code from your authenticator app.</div>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                placeholder="000000" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submitTotp()}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 22 }} />
              {error && <div style={errStyle}>{error}</div>}
              <Button variant="primary" size="lg" fullWidth disabled={code.length < 6 || busy} onClick={submitTotp}>
                {busy ? 'Verifying…' : 'Verify'}
              </Button>
            </>
          )}

          {step === 'forgot' && (
            <>
              <EmailChip email={email.trim()} onChange={() => setStep('email')} />
              <div style={hintStyle}>We'll email you a link to reset your password.</div>
              <Button variant="primary" size="lg" fullWidth disabled={!emailValid || busy} onClick={sendReset}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setStep('signin')} style={linkStyle}>Back to sign in</button>
            </>
          )}

          {step === 'forgot-sent' && (
            <>
              <div style={{ ...hintStyle, fontSize: 15 }}>
                If an account exists for <b>{email.trim()}</b>, a reset link is on its way. Check your email.
              </div>
              <Button variant="secondary" size="md" fullWidth onClick={() => setStep('signin')}>Back to sign in</Button>
            </>
          )}

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

function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
        background: 'var(--surface-card)', padding: '12px 14px', cursor: 'pointer',
        fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-body)',
      }}>
      <span>{email}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>Change</span>
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', fontSize: 16,
  fontFamily: 'var(--font-body)', border: '1.5px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface-card)',
  color: 'var(--text-body)', outline: 'none', boxShadow: 'var(--shadow-inset)',
}
const hintStyle: React.CSSProperties = { fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center' }
const errStyle: React.CSSProperties = { fontSize: 13, color: 'var(--red-error)', textAlign: 'center' }
const linkStyle: React.CSSProperties = {
  border: 0, background: 'none', cursor: 'pointer', fontSize: 13,
  color: 'var(--lagoon-700)', fontFamily: 'var(--font-body)', padding: 0,
}
