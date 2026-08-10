import { useState } from 'react'
import QRCode from 'qrcode'
import { Button, Sheet } from './primitives'
import { auth as authApi } from '../lib/api'
import { useAuth } from '../lib/auth-context'

// TOTP enrollment sheet for manager/admin accounts. Password → QR + backup
// codes → verify a code to confirm. Uses Better Auth's two-factor endpoints.
type Phase = 'password' | 'scan' | 'done'

export function TwoFactorSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh } = useAuth()
  const [phase, setPhase] = useState<Phase>('password')
  const [password, setPassword] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reset = () => { setPhase('password'); setPassword(''); setQr(null); setBackupCodes([]); setCode(''); setErr(null) }

  const enable = async () => {
    if (!password || busy) return
    setBusy(true); setErr(null)
    try {
      const { totpURI, backupCodes } = await authApi.twoFactorEnable(password)
      setQr(await QRCode.toDataURL(totpURI, { margin: 1, width: 220 }))
      setBackupCodes(backupCodes)
      setPhase('scan')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Wrong password')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (code.trim().length < 6 || busy) return
    setBusy(true); setErr(null)
    try {
      await authApi.verifyTotp(code.trim())
      await refresh()
      setPhase('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That code did not match — try the next one.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>
          Two-factor authentication
        </div>

        {phase === 'password' && (
          <>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Protect this account with an authenticator app (Google Authenticator, 1Password, Authy…).
              Confirm your password to start.
            </p>
            <input type="password" autoComplete="current-password" placeholder="Your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enable()} style={inputStyle} />
            {err && <div style={errStyle}>{err}</div>}
            <Button variant="primary" size="lg" fullWidth disabled={!password || busy} onClick={enable}>
              {busy ? 'Setting up…' : 'Continue'}
            </Button>
          </>
        )}

        {phase === 'scan' && (
          <>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              1. Scan this with your authenticator app.
            </p>
            {qr && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img src={qr} alt="2FA QR code" style={{ width: 200, height: 200, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />
              </div>
            )}
            {backupCodes.length > 0 && (
              <div style={{ background: 'var(--surface-tint)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lagoon-700)', marginBottom: 6 }}>
                  Backup codes — save these
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-body)' }}>
                  {backupCodes.map((bc) => <span key={bc}>{bc}</span>)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Each works once if you lose your phone.
                </div>
              </div>
            )}
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              2. Enter the 6-digit code to confirm.
            </p>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 22 }} />
            {err && <div style={errStyle}>{err}</div>}
            <Button variant="primary" size="lg" fullWidth disabled={code.length < 6 || busy} onClick={verify}>
              {busy ? 'Verifying…' : 'Turn on 2FA'}
            </Button>
          </>
        )}

        {phase === 'done' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green-success)' }}>✓ Two-factor is on.</div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
              You'll enter a code from your authenticator each time you sign in.
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={() => { reset(); onClose() }}>Done</Button>
          </>
        )}
      </div>
    </Sheet>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '13px 15px', fontSize: 16,
  fontFamily: 'var(--font-body)', border: '1.5px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', color: 'var(--text-body)', outline: 'none',
}
const errStyle: React.CSSProperties = { fontSize: 13, color: 'var(--red-error)' }
