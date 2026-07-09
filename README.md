# Dog Boarding App

An open-source, self-hostable web app for a small home-based **dog boarding business** — booking,
owned in-app messaging with photo report cards, per-dog timed medication/feeding alerts, and
Uber-style open-shift claiming for staff, all under management oversight.

> **Status: build phase — full demo runs end-to-end.** Architecture, license analysis, data model,
> API contract, NixOS server design, and the hi-fi visual design ("Zoomez") are done. The **API
> monolith is implemented** (Hono + Drizzle + Better Auth, 61 passing tests) and **all three PWA
> role views (Customer, Staff, Management) are wired to it live** — booking, messaging, care tasks,
> shift claiming, report cards, approvals, and reports all round-trip through the real API. Pending
> third-party accounts are honestly stubbed: payments (Stripe), e-signature (DocuSeal), and photo
> uploads (object storage). **The master task list is [`docs/build-plan.md`](docs/build-plan.md)** —
> implementers (human or model) start there. Conflicts between docs are resolved by
> [`docs/decisions.md`](docs/decisions.md).

## Run it locally (Mac/Linux)

Zero infrastructure — no Postgres, no Docker, no Tailscale. The dev database is
[PGlite](https://pglite.dev) (Postgres compiled to WASM, in-process), so the whole app runs from a
single command. **You only need [Node 22+](https://nodejs.org)** (`brew install node`).

```bash
git clone https://github.com/justinan7/dog-boarding-app
cd dog-boarding-app
./scripts/dev-local.sh          # installs deps, migrates + seeds demo data, starts everything
```

Then open **http://localhost:5173** — or, **on your phone** (same Wi-Fi), the LAN URL the script
prints (`http://<your-mac-ip>:5173`). The script runs the API on `:3000`, the PWA on `:5173` (Vite
proxies `/api` to the API, so it's all same-origin — cookies and auth just work, phone included),
and loads the design's demo world (the in-residence dogs, the July stays, message threads, a sent
report card, open shifts to claim).

**Logging in** — hit **Sign up** (not sign in) and your role is matched by the email you use; the API
enforces the real role server-side, while the on-screen *demo bar* just swaps which view is rendered:

| Sign up with | Role you get |
|---|---|
| `corey@zoomez.app` (or `brette@zoomez.app`) | **Manager** — approvals, task board, oversight, reports |
| `tyler@zoomez.app` (or `maria@zoomez.app`) | **Staff** — today rail, checklists, shift claiming, threads |
| `sarah@example.com` | **Customer with data** — two dogs, a live stay, messages, a report card |
| any other email | Customer (auto-provisioned, empty) |

Password is anything 8+ characters. Manager approvals and the Reports screen are PIN-gated — **demo
PIN `1234`** (checked server-side; customers can't elevate even with the PIN). Re-run with
`./scripts/dev-local.sh --reseed` to wipe and reload the demo data.

**What's stubbed:** paying an invoice (Stripe account pending — invoices render read-only), waiver
e-signing (DocuSeal pending), and photo uploads (object storage pending). Everything else is real:
book a stay as Sarah, approve it as Corey, and the care tasks materialize on Jack's board.

> This local database is a throwaway demo (PGlite, persisted under `server/.data/`, gitignored). It
> holds only the sample world above — never real customer data.

## Repository layout

| Path | What it is |
|---|---|
| `docs/` | The paper trail: build plan, decision log, API contract, data model, architecture, licenses |
| `design/` | The Claude Design handoff — hi-fi `.dc.html` for all three role views + design-system tokens (visual truth) |
| `web/` | The PWA (React + TS + Vite) — Management view wired to the live API; Customer/Staff render design sample data (next) |
| `server/` | The Node/TS API monolith (Hono + Drizzle + Better Auth) — implemented; PGlite for local dev, Postgres in prod |
| `scripts/` | `dev-local.sh` — one-command local run (see [Run it locally](#run-it-locally-maclinux)) |
| `infra/` | The NixOS flake for the production VPS (Postgres, Caddy, Garage, Centrifugo, DocuSeal, backups, monitoring) |

## Why this exists

The business runs today on group texts + a manual calendar. Off-the-shelf pet-boarding SaaS
(Gingr, Time To Pet, etc.) was evaluated and rejected: **no product combines** date-range boarding
ops, owned iMessage-quality messaging with management take-over, and first-come open-shift claiming
with per-dog timed med alerts. Those differentiators are custom relational logic no product ships,
so this is a **build-custom app** that adopts open-source building blocks only where one genuinely
slides in cheaper than building it.

## Who uses it (three role-based views, one PWA)

- **Customers** (dog owners, mostly iOS) — request date-range stays, get photo report cards, message
  the team, pay deposits/invoices, buy add-ons, sign waivers, upload vaccination records.
- **Staff** (Android + iOS) — claim open shifts, work per-dog timed med/feeding/task checklists, post
  photos / build report cards, message customers from the app (never a personal phone).
- **Management** — oversee everything: approve bookings & shift claims, **view and take over** any
  staff↔customer thread, watch the live task board, run reports.

## Recommended stack (summary)

A single **Node.js/TypeScript + PostgreSQL (Drizzle)** monolith, **AGPL-3.0-or-later**, on one
Docker-Compose VPS. One Postgres is the single system of record. Adopt only commodity plumbing:

| Layer | Choice | License |
|---|---|---|
| App + API + PWA | Custom Node/TS monolith · Vite + React PWA | AGPL-3.0-or-later / MIT |
| Auth & invites | Better Auth (in-process) | MIT |
| Realtime | Centrifugo (sidecar) | Apache-2.0 |
| Jobs / scheduling | pg-boss (in Postgres, no Redis) | MIT |
| Object storage | SeaweedFS (self-host) / DO Spaces (managed) | Apache-2.0 / proprietary |
| Image processing | sharp (libvips + HEIF) | Apache-2.0 |
| E-signature | DocuSeal (sidecar) | AGPL-3.0 |
| Admin CRUD | React-Admin | MIT |
| Payments | Stripe behind a PSP-neutral wrapper | proprietary API |

Full rationale, per-component candidates, and the license-compliance matrix are in the docs.

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/build-plan.md`](docs/build-plan.md) | **Start here** — the master task list: workstreams, ownership, DoD + verification per task |
| [`docs/decisions.md`](docs/decisions.md) | Decision log (ADR-lite) — newest entry wins doc conflicts |
| [`docs/api-contract.md`](docs/api-contract.md) | Binding HTTP API contract shared by the PWA, iOS, Android, and the server |
| [`docs/data-model.md`](docs/data-model.md) | Entities, relationships, and the invariants to test first (date-range overlap, local-time+zone alerts, race-safe shift claims, append-only audit) |
| [`docs/architecture-and-components.md`](docs/architecture-and-components.md) | The 30-component inventory and the OSS candidates evaluated per component (with verified licenses) |
| [`docs/licenses.md`](docs/licenses.md) | App license decision, the third-party license matrix, attribution obligations, and the source-available projects deliberately avoided |
| [`infra/README.md`](infra/README.md) | The NixOS VPS design: host spec, service map, secrets, backups/DR, deploy workflow, runbooks |

## License

**AGPL-3.0-or-later** — see [`LICENSE`](LICENSE) and the reasoning in [`docs/licenses.md`](docs/licenses.md).
The app's business logic is its whole value; AGPL closes the "SaaS loophole" so a hosted competitor
who modifies and runs it must publish their changes. Third-party AGPL/GPL building blocks are each
run **unmodified as separate network services**, which keeps their copyleft contained to their own
container and away from this codebase.
