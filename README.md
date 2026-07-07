# Dog Boarding App

An open-source, self-hostable web app for a small home-based **dog boarding business** — booking,
owned in-app messaging with photo report cards, per-dog timed medication/feeding alerts, and
Uber-style open-shift claiming for staff, all under management oversight.

> **Status: build phase.** Architecture, license analysis, data model, API contract, NixOS server
> design, and the hi-fi visual design ("Zoomez") are done; the Management PWA view is implemented.
> **The master task list is [`docs/build-plan.md`](docs/build-plan.md)** — implementers (human or
> model) start there. Conflicts between docs are resolved by [`docs/decisions.md`](docs/decisions.md).

## Repository layout

| Path | What it is |
|---|---|
| `docs/` | The paper trail: build plan, decision log, API contract, data model, architecture, licenses |
| `design/` | The Claude Design handoff — hi-fi `.dc.html` for all three role views + design-system tokens (visual truth) |
| `web/` | The PWA (React + TS + Vite) — Management view implemented; Customer/Staff next |
| `infra/` | The NixOS flake for the production VPS (Postgres, Caddy, Garage, Centrifugo, DocuSeal, backups, monitoring) |
| `server/` | The Node/TS API monolith — *not yet scaffolded; task B1 in the build plan* |

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
