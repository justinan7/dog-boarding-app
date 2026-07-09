import { api } from './api'

// Web-push subscribe flow. On iOS this only works from an INSTALLED PWA
// (Add to Home Screen) — Safari tab pushes don't exist; we surface that hint.

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return !!sub && Notification.permission === 'granted'
}

/** Ask permission, subscribe, register with the API. Throws with a friendly
 *  message on the common failure modes. */
export async function enablePush(vapidPublicKey: string): Promise<void> {
  if (!pushSupported()) {
    const isIOS = /iPhone|iPad/.test(navigator.userAgent)
    throw new Error(isIOS
      ? 'On iPhone, add Zoomez to your Home Screen first (Share → Add to Home Screen), then enable notifications from the installed app.'
      : 'This browser does not support push notifications.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications were not allowed.')

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  })

  await api.post('/api/v1/push/subscriptions', {
    platform: 'webpush',
    token: JSON.stringify(sub.toJSON()),
    deviceName: navigator.userAgent.slice(0, 120),
  })
}
