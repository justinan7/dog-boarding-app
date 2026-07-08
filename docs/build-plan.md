# Zoomez build plan — the master task list

**Purpose:** let any capable model (or human) pick up the next task and execute it without
re-deriving context. Work one task per session. This file is the coordination point — update the
status column when a task lands.

## How to work a task

1. Read this file's *Working agreement*, then the task's **Context** docs — nothing else is required.
2. Do the task exactly to its **DoD** (definition of done). Don't expand scope; if the task reveals a
   design gap, note it under *Open questions* at the bottom and stop at the boundary.
3. Run the task's **Verify** steps. All of them. Paste real output in the commit/PR description.
4. Commit (small, scoped, conventional message), push, tick the checkbox here with the date.

## Working agreement (all implementers)

- **Docs of record**: [`decisions.md`](decisions.md) resolves conflicts → [`api-contract.md`](api-contract.md)
  (HTTP surface) → [`data-model.md`](data-model.md) (schema + invariants) →
  [`architecture-and-components.md`](architecture-and-components.md) (stack rationale) →
  [`../infra/README.md`](../infra/README.md) (server design) → [`../design/README.md`](../design/README.md) (visual truth).
- **No new dependencies** without checking `licenses.md` rules (OSI only; AGPL/GPL only as separate
  services; record additions in the matrix).
- **Never commit secrets.** Machine secrets: sops-nix (`infra/`). Human vault: 1Password `AgentAccess`.
- **Money in integer cents. Schedule times as local-time + IANA zone.** No floats, no bare-UTC schedules.
- **Every state transition writes an audit row** in the same transaction (api-contract §6.1).
- TypeScript strict; server code mirrors `web/`'s idiom (small modules, no framework magic).
- Commit trailer: `Co-Authored-By:` yourself as appropriate; reference the task id (e.g. `[B4]`).

## Who builds what (ADR-007)

| Owner | Scope |
|---|---|
| **Smaller model** | Workstreams **A** (infra) and **B** (backend) — this file is written for you |
| **Fable** | Workstream **C** (PWA: Customer + Staff views, wiring, PWA-ification) + keeping these docs true |
| **Opus** | Workstream **D** (native iOS + Android) — inputs: `api-contract.md`, `design/README.md` + the three hi-fi `.dc.html` files |
| **Justin** | Workstream **J** (accounts, domain, money): the tasks only a human with credit cards can do |

---

## Workstream J — human prerequisites (Justin)

| # | Task | Needed before | Status |
|---|---|---|---|
| J1 | Provision the VPS (DigitalOcean droplet, **4 GB / 2 vCPU / 80 GB**, region SFO; or Hetzner equivalent). Record IP. | A1 | ☐ |
| J2 | Pick + register the app domain (e.g. `zoomez.app`); point `A`/`AAAA` at the VPS, plus `sign.` and `status.` subdomains. | A5 | ☐ |
| J3 | Create offsite backup bucket (Backblaze B2 or similar S3, separate provider from the VPS) + key. Store in 1Password. | A10 | ☐ |
| J4 | Stripe account for the business (Corry/Brette as owners); restricted API key + webhook secret → 1Password. | B10 | ☐ |
| J5 | Tailscale auth key (tagged, pre-authorized) for the VPS → 1Password. | A2 | ☐ |
| J6 | Apple Developer + Google Play accounts (for Workstream D, later). | D1/D2 | ☐ |

## Workstream A — infra (NixOS VPS) · owner: smaller model

Design + skeleton live in [`../infra/`](../infra/). Tasks apply/extend that skeleton **on the real
host**. Context for all A-tasks: `infra/README.md`, `decisions.md` (ADR-003…006, 008, 009).

| # | Task | DoD | Verify | Status |
|---|---|---|---|---|
| A1 | Bootstrap NixOS onto the VPS with nixos-anywhere + disko from `infra/` | Host boots NixOS from our flake; SSH works | `ssh root@<ip> nixos-version` | ☐ |
| A2 | Admin plane: tailscale join (authKey via sops), SSH keys-only, firewall = public 80/443 only | Host reachable at `zoomez.<tailnet>.ts.net`; public port scan shows 80/443(+22 if kept) only | `tailscale ping zoomez`; `nmap` from outside | ☐ |
| A3 | Secrets: sops-nix wired; age key on host; `secrets.yaml` populated from 1Password | A sample secret renders to `/run/secrets/*` owned by the right unit user | `systemctl cat` shows EnvironmentFile; secret file exists, mode 0400 | ☐ |
| A4 | PostgreSQL up (version pinned in flake), app db+user, `pg_trgm`, WAL archiving config present (target may be dummy until A10) | `psql` as app user over localhost works | `sudo -u postgres psql -c 'select version()'` | ☐ |
| A5 | Caddy serving a placeholder on the apex domain with real TLS; `sign.`/`status.` vhosts stubbed | `https://<domain>` returns 200 with valid cert | `curl -I` | ☐ |
| A6 | Garage single-node: layout applied, buckets `zoomez-media` + `zoomez-docs`, app key; presigned PUT verified | Upload via presigned URL from a laptop succeeds | `aws s3api put-object --endpoint …` + presign test | ☐ |
| A7 | Centrifugo running with JWT auth config; websocket endpoint proxied by Caddy | `wscat` connects through `https://<domain>/connection/websocket` | connect + ping | ☐ |
| A8 | App services (api + worker) defined, pointing at the `server/` package — **enable after B1 exists**; until then dry-build only | `nixos-rebuild build` green with services enabled in a branch | build log | ☐ |
| A9 | DocuSeal via the **native `services.docuseal` module** (no container; create secret-key-base per module runbook), own db in our Postgres, served at `sign.<domain>` | Admin UI reachable; waiver template created | browser check via tailnet, then public | ☐ |
| A10 | Backups live: `services.postgresqlBackup` (nightly dumps) + `services.restic.backups.offsite`→B2 + **`services.pgbackrest` PITR stanza** (archiving on + the `systemCallFilter."setrlimit"` fix in `modules/postgres.nix`) | All timers fire green; `pgbackrest info` shows a backup; a PITR restore rehearsed once | `systemctl list-timers`; force-run units; restore test | ☐ |
| A11 | Monitoring: Uptime Kuma at `status.` (tailnet-gated), Netdata local, unit-failure → ntfy alerts; Kuma push monitor reserved for med-alert heartbeat (B8) | Killing a test unit produces an ntfy ping | `systemctl kill` a dummy unit | ☐ |
| A12 | **Restore drill #1** (calendared quarterly after): restore last night's backups to a local VM; document timing + gaps in `infra/README.md` runbook | A written drill log in the repo | drill log committed | ☐ |

## Workstream B — backend (`server/`) · owner: smaller model

Context for all B-tasks: `api-contract.md` (binding), `data-model.md` (schema + the 6 invariants),
`architecture-and-components.md` §2 (library choices: Better Auth, Drizzle, pg-boss, sharp, web-push).
Stack: Node 22 + TypeScript strict + **Hono** (routing) + **Drizzle** (Postgres) + **zod** (validation)
— all MIT. No framework beyond that.

| # | Task | DoD | Verify | Status |
|---|---|---|---|---|
| B1 | Scaffold `server/`: package.json (pinned deps), tsconfig, `src/{db,routes,services,jobs,lib}/`, Drizzle config, `.env.example`, health route, Vitest wired, README | `npm run dev` serves `/api/v1/health`; `npm test` green | curl + test run | ☑ 2026-07-07 |
| B2 | Drizzle schema + migration for **all** `data-model.md` tables (enums included), plus seed script with the design's sample data (Biscuit, Bella, Rocky, Jack, Maria…) | `db:migrate` clean on fresh db; seed loads | migrate + seed + `\dt`. | ☑ 2026-07-08 |
| B3 | Better Auth mounted (email+password, magic link, **bearer plugin** for native), roles, `/me`, manager PIN elevate/de-elevate per contract §2.3 | Auth flows pass integration tests incl. bearer round-trip | Vitest against PGlite | ☑ 2026-07-08 |
| B4 | Customers/pets/care-profile/vaccinations/safety-flags routes (§5.2) + audit middleware pattern established | Contract-shape tests green | Vitest | ☑ 2026-07-08 |
| B5 | Capacity + reservations + lifecycle (§5.3): range-overlap capacity query, approve materializes CareTasks, capacity gate (409 without overrideCapacity), check-in/out state machine | Invariant 1 capacity gate tested; lifecycle (request→approve→check-in→check-out) + deny + cancel tested. *(Concurrent-approve test deferred to real PG — PGlite is single-connection.)* | Vitest against PGlite | ☑ 2026-07-08 |
| B6 | Threads/messages + oversight (§5.4): silent-view auditing, join/take-over/hand-back, staff mute on takeover; care-task CRUD + complete w/ manager-override audit (§5.5); report-card draft→send→heart (§5.7). *(Centrifugo publish + `/realtime/token` deferred to B8 wiring.)* | Oversight transitions all audit-logged; care-task completion + override; report-card lifecycle | Vitest | ☑ 2026-07-08 |
| B7 | Uploads (§5.1): presigned PUT via Garage S3 API, HEIC→JPEG + thumbnail pg-boss job (sharp w/ libheif — **CI must decode a real .heic fixture**), signed GET URLs | HEIC fixture round-trips to JPEG + thumb | Vitest + fixture | ☐ |
| B8 | Care tasks + scheduler (§5.5): materialization, local-time+zone→UTC computation, pg-boss deferred jobs, due→overdue escalation, on-shift routing stub (all-staff until B9), startup catch-up sweep, Kuma heartbeat ping on dispatch | Invariants 3 & 4 tests; reboot-drops-nothing test (kill worker, restart, sweep fires) | Vitest + manual kill test | ☐ |
| B9 | Shifts (§5.6): open board, **race-safe first-come claim (partial unique index)**, approve/deny/withdraw, overlap detection + audit. `on_shift_now` view + concurrent-claim test deferred to real PG. | Claim lifecycle; overlap; audit | Vitest | ☑ 2026-07-08 |
| B10 | Stripe (§5.8): PSP-neutral wrapper, hosted checkout session, idempotent + out-of-order-safe webhook, reconciliation sweep job, invoices/addons | Invariant 6 test: duplicate + out-of-order webhook events | Vitest + stripe-cli | ☐ |
| B11 | DocuSeal (§5.9): template-based submission via REST, signing-link, completion webhook → signed PDF into Garage, waiver status gate feeding B5 | e2e against the A9 instance | manual e2e + Vitest mocks | ☐ |
| B12 | Report cards (§5.7 — done in B6), addons catalog read (§5.8), incidents (§5.10), reports summary + audit log (§5.11), push subscription CRUD (§5.12). *(Web-push send + SMS-nudge adapter deferred to B8 wiring.)* | Contract routes for all P1+P2 surfaces | Vitest | ☑ 2026-07-08 |
| B13 | CI: GitHub Actions — server typecheck + test + build; web typecheck + build. *(OpenAPI generation deferred — routes are Hono, not @hono/zod-openapi; adding it is a separate refactor.)* | CI green on a fresh clone | GH Actions | ☑ 2026-07-08 |
| B14 | Deploy: `buildNpmPackage` in `infra/` builds `server/`; enable A8 services; smoke the full stack over the real domain | `https://<domain>/api/v1/health` green from the internet; PWA login works | curl + browser | ☐ |

**Order:** B1→B2→B3 strictly; then B4/B5/B6/B7 in any order; B8 after B5; B9 after B8; B10–B13 after
the P1 core; B14 last. Phases match the contract tags: P1 = B1–B8 + B12(report cards), P2 = B10/B11/rest
of B12, P3 = B9 + task-board polish.

## Workstream C — PWA (`web/`) · owner: Fable

| # | Task | Status |
|---|---|---|
| C1 | Customer view from `design/Zoomez Customer Hi-Fi.dc.html` (8 screens, same primitives/tokens) | ☑ 2026-07-07 |
| C2 | Staff view from `design/Zoomez Staff Hi-Fi.dc.html` (8 screens incl. add-task sheet, view-switcher) | ☑ 2026-07-07 |
| C3 | API client + auth context + login + auth-gated shell; TanStack Query data layer (`lib/queries.ts`); **Management view (all 5 screens: Dashboard, Calendar, Task board, Reports, + Inbox list) wired to live API** and verified against the real CT. *(Customer + Staff views still render sample data — same pattern to apply. Centrifugo client deferred.)* | ◑ 2026-07-08 — Management live; Customer/Staff pending |
| C4 | PWA-ification: polished manifest, minimal service worker (offline shell cache, network-first API), SW registration in prod. *(Web-push subscribe + iOS Declarative + install coach marks deferred to when push backend exists.)* | ☑ 2026-07-08 |
| C5 | Serve from the monolith in prod (static assets), remove the desktop phone-frame chrome for real mobile use (frame stays for desktop demo) | ☐ |
| — | *Done:* Management view (5 screens, 2026-07-07); Customer (8) + Staff (7) views + role-routed shell with PIN gate (2026-07-07). All 24 screens build clean + pass an SSR render smoke test. | ☑ |

## Workstream D — native apps · owner: Opus

**Inputs (all in this repo):** `docs/api-contract.md` (binding), `design/README.md` + the three
`.dc.html` hi-fi files + `design/design-system-tokens/*.css` (exact colors/type/spacing),
`web/src/components/primitives.tsx` (reference React implementation of the DS components).

| # | Task | Notes | Status |
|---|---|---|---|
| D0 | Propose stack (native Swift/Kotlin vs shared KMP/RN) as a short ADR PR before writing code | must justify against solo-maintainer upkeep; decision recorded in `decisions.md` | ☐ |
| D1 | iOS app: all three role views, bearer auth, APNs push, photo upload via presigned PUT | TestFlight build | ☐ |
| D2 | Android app: same scope, FCM push | Play internal track | ☐ |
| D3 | Backend push senders for APNs/FCM (small B-side task, coordinate via api-contract §5.12) | pairs with B12 | ☐ |

Rules for D: consume only documented endpoints; if something's missing, amend `api-contract.md` by PR
first (never invent). Store tokens in Keychain/Keystore. Match the design system exactly — tokens are
in CSS but map 1:1 to native constants.

## Workstream E — launch

| # | Task | Status |
|---|---|---|
| E1 | Seed real data with Brette (dogs, customers, rates, waiver template) — guided session | ☐ |
| E2 | Pilot: one real week alongside the group texts; collect friction list | ☐ |
| E3 | Restore drill #2 + on-call notes ("app is down" paper fallback for Brette) | ☐ |
| E4 | Cut over; retire the group thread 🎉 | ☐ |

## Current status (2026-07-07)

- ✅ Research + architecture + license matrix + data model + design handoff.
- ✅ Full PWA — all three role views (24 screens), builds clean + SSR-smoke-passes (WS-C C1/C2).
- ✅ Plan + API contract + decision log + NixOS design/flake skeleton (`infra/`).
- ✅ **B1–B9, B12, B13** — full backend: 15 routers, ~45 endpoints, 52 tests, auth (Better Auth +
  bearer + PIN), the complete P1 route surface, pg-boss scheduler, sharp media pipeline, CI.
- ✅ **C1–C4** — full PWA: 24 screens (3 roles), login, auth context, API client, service worker.
- ▶️ **Blocked on infra/accounts:** B10 (Stripe → J4), B11 (DocuSeal → A9), B14 (deploy → J1/J2/A1),
  C5 (serve from monolith → B14), D0–D3 (native apps → API live). Next: **create a Proxmox CT**
  for a dev Postgres (concurrent-invariant tests + pg-boss integration), then J-tasks to unblock prod.

### Dev-database approach (decided 2026-07-07; CT live 2026-07-08)

Local dev + tests + CI use **PGlite** (Postgres-as-WASM, in-process) — zero infrastructure, driver
auto-selected by `DATABASE_URL` scheme; prod points at the real Postgres 17 unchanged.

**Dev/test server: Proxmox CT 145 `zoomez-devdb`** — Debian 13 + PostgreSQL 17, tailnet-only
(`zoomez-devdb.lion-manta.ts.net` / 100.113.21.118:5432), ephemeral. Creds in `server/.env`
(gitignored). Point the app at it with `set -a; source .env; set +a`. Verified 2026-07-08 against real
PG: migrations + seed apply, full API auth round-trip (signup→/me with provisioning), pg-boss connects +
creates its schema + catch-up sweep fires, and **`scripts/concurrency-check.ts` proves invariant 2** —
8 concurrent shift claims → exactly 1 wins, 7 rejected by the partial unique index (the thing PGlite
can't test). Run: `set -a; source .env; set +a; npx tsx scripts/concurrency-check.ts`.

## Open questions

- Domain name / final product branding confirmation with Corry & Brette (design says "Zoomez").
- Twilio SMS nudges: defer to P2 (interface stubbed in B12) — confirm toll-free verification timing.
- DocuSeal "Powered by" attribution acceptable, or budget Pro? (default: accept attribution)
- **Everything above is built on unconfirmed assumptions** — Corry hasn't confirmed requirements yet;
  no VPS provisioned, no spend. Current work is deliberately all local/reversible.
