# Dog Boarding App

An open-source, self-hostable web app for a small home-based **dog boarding business** — booking,
owned in-app messaging with photo report cards, per-dog timed medication/feeding alerts, and
Uber-style open-shift claiming for staff, all under management oversight.

> **Status: design / scaffold phase.** This repository currently contains the architecture,
> component inventory, license analysis, data-model draft, and a design brief. The UI is designed
> separately; application code has not been scaffolded yet. See [`docs/`](docs/).

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
| [`docs/architecture-and-components.md`](docs/architecture-and-components.md) | Recommended architecture, the 30-component inventory, and the OSS candidates evaluated per component (with verified licenses) |
| [`docs/licenses.md`](docs/licenses.md) | App license decision, the third-party license matrix, attribution obligations, and the source-available projects deliberately avoided |
| [`docs/design-brief.md`](docs/design-brief.md) | For the UI designer — personas, information architecture, screen inventory, and lo-fi wireframe references for all three views |
| [`docs/data-model.md`](docs/data-model.md) | Draft entities, relationships, and the tricky invariants (date-range overlap, local-time+zone alerts, race-safe shift claims, append-only audit) |

## License

**AGPL-3.0-or-later** — see [`LICENSE`](LICENSE) and the reasoning in [`docs/licenses.md`](docs/licenses.md).
The app's business logic is its whole value; AGPL closes the "SaaS loophole" so a hosted competitor
who modifies and runs it must publish their changes. Third-party AGPL/GPL building blocks are each
run **unmodified as separate network services**, which keeps their copyleft contained to their own
container and away from this codebase.
