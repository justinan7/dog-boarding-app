# Go-live plan — independent VPS

**Status: plan.** The current production (`docs/PRODUCTION.md`) is a **testing
platform** running as a NixOS VM inside Justin's homelab. When the business
commits, Zoomez moves to a **dedicated VPS that shares nothing with the
homelab** — its own host, its own secrets, its own email account, its own
backups. This doc is the blueprint for that move.

## Why independent

The homelab is a hobby environment: it reboots for experiments, its Tailscale
tailnet and RackNerd edge are personal, and its secrets (1Password `AgentAccess`,
sops age keys) are Justin's. A real business the family depends on must not
inherit any of that coupling. Concretely, on the VPS:

- **Its own domain + DNS** (e.g. a real `zoomez.app`, not `*.4nunns.com`).
- **Its own TLS** at the VPS edge (Caddy with public ACME) — no RackNerd hop,
  no homelab tailnet in the request path.
- **Its own secrets** — a fresh secret store (sops-nix with a NEW age key, or
  the provider's secret manager). None of the homelab's keys carry over.
- **Its own email account** (Resend) — the business's account and API key, not
  the homelab's Resend/iCloud setup.
- **Its own backups** — offsite bucket owned by the business.

The application code is already portable across both: everything that differs
is **environment config**, nothing is hardcoded to the homelab.

## Deployment shape: containers (Docker Compose)

The homelab test box is NixOS-native (no containers) because that matched the
homelab. The VPS go-live target is **Docker Compose** — it's the most portable,
provider-agnostic option and matches "prepare for containers to run resend etc."
One `docker-compose.yml` on a small VPS (2 vCPU / 4 GB is plenty to start):

| Service | Image | Notes |
|---|---|---|
| `caddy` | `caddy:2` | Public TLS (ACME), reverse-proxy to app + centrifugo + docuseal |
| `app` | built from `server/` (+ `web/` dist baked in as `WEB_DIST`) | api + worker; or split into two services sharing the image |
| `postgres` | `postgres:17` | one volume; the single system of record |
| `centrifugo` | `centrifugo/centrifugo:v6` | realtime |
| `docuseal` | `docuseal/docuseal` | e-signature |
| `garage` | `dxflrs/garage:v2` | S3 object storage (photos) |

There is **no "Resend container"** — Resend is a hosted API the `app` calls over
HTTPS with `RESEND_API_KEY`. "Containers to run resend etc." = the app (which
sends the email) runs as a container alongside the rest; the transport is a
config value. If a self-hosted relay is ever preferred over Resend, it slots in
as one more compose service and one env change (see Email below).

A `Dockerfile` for the app is the only new artifact needed — `server/` already
builds to `dist/{api,worker,migrate,seed}.js` and serves `web/`'s built assets
via `WEB_DIST`. The NixOS flake in `infra/` stays as the homelab test
deployment; it is not thrown away.

## Email — already built, transport-agnostic

`server/src/lib/email.ts` is the whole email layer, chosen by env:

- `EMAIL_DRIVER=log` (today, homelab test): the message + any link go to the
  server log. Zero infra — read a reset link via `journalctl -u zoomez-api`.
- `EMAIL_DRIVER=resend` (VPS go-live): POSTs to the Resend API with
  `RESEND_API_KEY` + `EMAIL_FROM`, using the **business's own Resend account**.

Password reset and magic-link sign-in already flow through this. Nothing in the
app changes at go-live — set three env vars and the same code sends real email.

### Go-live email checklist
1. Create the business's Resend account; verify the sending domain (SPF/DKIM
   DNS records Resend provides).
2. Set on the VPS: `EMAIL_DRIVER=resend`, `RESEND_API_KEY=…`,
   `EMAIL_FROM="Zoomez <noreply@thedomain>"`, `APP_URL=https://thedomain`.
3. Send a test reset to yourself; confirm delivery + the link opens the PWA at
   `/?reset=<token>`.

## Password reset — status

**Built and tested** (works today via the log driver; real email at go-live):
- `POST /api/auth/request-password-reset {email}` → emails a link to
  `${APP_URL}/?reset=<token>` (token valid 1 hour).
- The PWA detects `?reset=` on load and renders the new-password screen, which
  calls `POST /api/auth/reset-password {token,newPassword}`.
- Login screen has "Forgot password?" → sends the link; the response never
  reveals whether the email exists.
- Covered by `test/auth-flows.test.ts` (request → link → reset → old password
  rejected).

## Two-factor (TOTP) — status

**Built and tested.** Better Auth `twoFactor` plugin (authenticator apps).
Manager/admin accounts get a persistent enrollment nudge + a setup flow (QR +
backup codes) in Manager → More → Two-factor. Sign-in with 2FA on requires the
6-digit code after the password. Nothing environment-specific — it works the
same on the VPS.

## Migration runbook (homelab test → VPS), when the business commits

1. **Provision the VPS**, install Docker + Compose, point the real domain's DNS
   at it.
2. **Author `Dockerfile` + `docker-compose.yml`** (shapes above) and a
   `.env` from a fresh secret set (new `BETTER_AUTH_SECRET`, `MANAGER_PIN`,
   VAPID pair, Centrifugo keys, Garage keys, Resend key). **Generate all fresh
   — do not copy homelab secrets.**
3. `docker compose up -d`; run `zoomez-migrate` (one-off) against the fresh
   Postgres. Do **not** seed — enter real data, or migrate real data if the
   test period produced any worth keeping (pg_dump → restore).
4. Set `zoomez.app.demoMode`/`DEMO_MODE=false` so demo chrome is gone and the
   seeder is locked out.
5. DocuSeal first-run (its admin + waiver template + API key) as in
   `docs/PRODUCTION.md`.
6. Offsite backups: nightly `pg_dump` + Garage volume → the business's own
   B2/S3 bucket (restic), with a restore rehearsal.
7. Decommission the homelab VM once the VPS is verified.

## What stays identical across both

The app is the constant; only config moves. Same code paths, same tests, same
migrations. That's the point of keeping every homelab-specific thing
(tailnet, RackNerd, homelab secrets) out of the application and in the
environment — the go-live is a redeploy, not a rewrite.
