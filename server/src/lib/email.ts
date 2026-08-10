import { env } from '../env'
import { log } from './log'

// Transactional email — deliberately transport-agnostic so the go-live VPS
// stays independent of the homelab. Driver is chosen by env:
//   EMAIL_DRIVER=log     (default) → writes the message + any link to the log.
//                                     Usable in the homelab test env with zero
//                                     email infra: read the reset link from
//                                     `journalctl -u zoomez-api`.
//   EMAIL_DRIVER=resend  → POSTs to the Resend API (RESEND_API_KEY, EMAIL_FROM).
//                          On the VPS this uses the BUSINESS's own Resend
//                          account/key — never a homelab credential.
// Adding SMTP/Postmark later = one more branch here; nothing else changes.

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 200)}`)
  }
}

// Test/dev outbox: the last message sent, for assertions in the log driver.
// Never populated by the resend driver / in prod.
export let lastEmail: EmailMessage | null = null

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.EMAIL_DRIVER === 'resend' && env.RESEND_API_KEY) {
    try {
      await sendViaResend(msg)
      log.info({ to: msg.to, subject: msg.subject }, 'email sent (resend)')
    } catch (err) {
      log.error({ to: msg.to, err: (err as Error).message }, 'email send failed')
      throw err
    }
    return
  }
  // log driver — the message (and any link) is visible in the server log.
  lastEmail = msg
  log.info({ to: msg.to, subject: msg.subject, text: msg.text }, 'email (log driver — not actually sent)')
}

// ---- templates -------------------------------------------------------------

const BRAND = 'Zoomez'
const wrap = (heading: string, body: string, cta?: { label: string; url: string }) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0C2B2A">
  <div style="font-size:22px;font-weight:700;color:#14403D;margin-bottom:16px">${BRAND}</div>
  <div style="font-size:18px;font-weight:600;margin-bottom:8px">${heading}</div>
  <div style="font-size:14px;line-height:1.6;color:#3a4a49">${body}</div>
  ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;background:#14403D;color:#F7F5EE;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">${cta.label}</a>
  <div style="font-size:12px;color:#8a9695;margin-top:16px;word-break:break-all">Or paste this link: ${cta.url}</div>` : ''}
</div>`

export async function sendPasswordReset(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Reset your ${BRAND} password`,
    html: wrap('Reset your password', "We got a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email.", { label: 'Reset password', url }),
    text: `Reset your ${BRAND} password (expires in 1 hour):\n${url}\n\nIf you didn't request this, ignore this email.`,
  })
}

export async function sendMagicLink(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Your ${BRAND} sign-in link`,
    html: wrap('Sign in to Zoomez', 'Tap the button to sign in. This link expires in 5 minutes.', { label: 'Sign in', url }),
    text: `Sign in to ${BRAND} (expires in 5 minutes):\n${url}`,
  })
}
