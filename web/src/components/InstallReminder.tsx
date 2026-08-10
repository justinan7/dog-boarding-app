import { useEffect, useState } from 'react'
import { Icon } from './Icon'

// Persistent "Add to Home Screen" reminder — shown until the app is actually
// installed (per Justin). Installing matters functionally: iOS push
// notifications ONLY work from an installed PWA. The banner can be collapsed
// for the current session but returns on the next launch until it's done.

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallReminder() {
  const [installed, setInstalled] = useState(isStandalone())
  const [dismissed, setDismissed] = useState(false) // this session only
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    // Re-check when returning from background (they may have added it).
    const onVis = () => { if (isStandalone()) setInstalled(true) }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  if (installed || dismissed) return null

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

  const install = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else if (isIOS) {
      setShowIosHelp(true)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed', left: 10, right: 10, bottom: 10, zIndex: 70,
          maxWidth: 380, margin: '0 auto',
          background: 'var(--lagoon-900)', color: 'var(--foam-50)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-float)',
          padding: '12px 12px 12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <Icon name="download" size={20} style={{ color: 'var(--accent-gold)', flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Add Zoomez to your Home Screen</div>
          <div style={{ fontSize: 12, color: 'var(--seaglass-200)' }}>
            Full-screen, one tap to open{isIOS ? ' — needed for notifications' : ''}.
          </div>
        </div>
        <button type="button" onClick={install}
          style={{
            flex: 'none', border: 0, cursor: 'pointer', borderRadius: 999,
            background: 'var(--foam-50)', color: 'var(--lagoon-900)',
            padding: '7px 14px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
          }}>
          {isIOS ? 'How' : 'Install'}
        </button>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Not now"
          style={{ flex: 'none', border: 0, background: 'none', cursor: 'pointer', color: 'var(--seaglass-200)', display: 'flex', padding: 4 }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {showIosHelp && (
        <div
          onClick={() => setShowIosHelp(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(12,31,30,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface-card)', borderRadius: '20px 20px 0 0', padding: '22px 22px 34px', maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-heading)' }}>Add to Home Screen</div>
            <IosStep n={1}>Tap the <b>Share</b> button <Icon name="upload" size={15} style={{ verticalAlign: 'middle' }} /> in Safari's toolbar.</IosStep>
            <IosStep n={2}>Scroll down and tap <b>Add to Home Screen</b>.</IosStep>
            <IosStep n={3}>Tap <b>Add</b> — Zoomez lands on your Home Screen.</IosStep>
            <button type="button" onClick={() => setShowIosHelp(false)}
              style={{ marginTop: 6, border: 0, cursor: 'pointer', borderRadius: 999, background: 'var(--lagoon-700)', color: 'var(--foam-50)', padding: '12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function IosStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 999, background: 'var(--seaglass-200)', color: 'var(--lagoon-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{n}</span>
      <span style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.5 }}>{children}</span>
    </div>
  )
}
