# Zoomez — server (API monolith)

Node 22 + TypeScript + **Hono** (routing) + **Drizzle** (Postgres) + **zod** (validation). Serves the
REST API from `../docs/api-contract.md` and (in prod) the PWA static assets. Two processes from one
package: **api** (HTTP + pg-boss producer) and **worker** (pg-boss consumer — timed alerts, media,
webhooks). This is the **B1 scaffold**; resource routes land per the build plan (B3–B12).

## Zero-infrastructure dev database

The DB driver is chosen by `DATABASE_URL` scheme, so local dev and tests need **no Postgres install,
no Docker**:

| Scheme | Driver | Use |
|---|---|---|
| `pglite://memory` | [PGlite](https://pglite.dev) — Postgres compiled to WASM, in-process | tests (default) |
| `pglite://.data/dev` | PGlite, persisted to `./.data/dev` | local dev (default) |
| `postgresql://…` | node-postgres | dev-against-a-server, **prod** |

PGlite *is* Postgres, so the same generated migrations apply everywhere. **Caveat:** PGlite is
single-connection — the concurrency-invariant tests (overbook / race-safe shift claim, tasks B5/B9)
need a real multi-connection Postgres; point `DATABASE_URL` at one for those.

### Dev/test server (real Postgres 17)

Proxmox **CT 145 `zoomez-devdb`** (Debian 13 + PG17, tailnet-only, ephemeral) is the multi-connection
dev DB. `server/.env` (gitignored) already points `DATABASE_URL` at it. Because the app reads
`process.env` directly, source `.env` for commands that should hit it:

```bash
set -a; source .env; set +a
npm run db:migrate        # apply migrations to the CT
npm run db:seed           # (re)load the design world — safe, data is throwaway
npx tsx scripts/concurrency-check.ts   # prove the first-come shift-claim race on real PG
```

Reach it directly at `zoomez-devdb.lion-manta.ts.net:5432` (100.113.21.118) over Tailscale.

## Commands

```bash
npm install
cp .env.example .env          # defaults to pglite://.data/dev — works immediately
npm run dev                   # tsx watch → http://localhost:3000  (auto-migrates in dev)
npm test                      # vitest (in-memory PGlite, migrations applied per file)
npm run typecheck             # tsc --noEmit
npm run db:generate           # regenerate migrations/ from src/db/schema.ts (offline)
npm run db:migrate            # apply migrations to $DATABASE_URL
npm run build                 # tsup → dist/{api,worker,migrate}.js
npm start                     # node dist/api.js   (prod does NOT auto-migrate)
```

Smoke: `curl localhost:3000/api/v1/health` → `{"status":"ok","db":"ok",…}`.

## Layout

```
src/
  api.ts        entry: HTTP server (dev auto-migrates; prod does not)
  worker.ts     entry: background jobs (pg-boss — stub until B8)
  migrate.ts    entry: `node dist/migrate.js` — the prod migration deploy step
  app.ts        Hono app factory (+ error envelope) — exported for tests
  env.ts        zod-validated env (fail-fast)
  routes/       health.ts, v1.ts  (resource routers mount into v1)
  db/           schema.ts (partial — B2 completes), client.ts (driver select), migrate.ts
  lib/          errors.ts (AppError + api-contract codes), log.ts (pino)
  services/     domain logic (per-area modules land here)
  jobs/         worker jobs (pg-boss)
migrations/     drizzle-kit output — committed, source of truth
test/           vitest (health + db round-trip)
```

## Prod (NixOS)

`../infra/modules/zoomez-app.nix` builds this with `buildNpmPackage` + `importNpmLock` and runs
`dist/api.js` + `dist/worker.js` as hardened systemd units. Migrations run as a deliberate deploy step
(`node dist/migrate.js`), never on boot. See build-plan task B14.

## Conventions (enforced as routes land — see api-contract §6)

- Money in integer cents; schedule times as local wall-clock + IANA zone.
- Every state transition writes an audit row in the same transaction.
- Authorization is SQL-shaped; race safety via DB constraints, not check-then-act.
