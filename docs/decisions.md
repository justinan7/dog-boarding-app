# Decision log (ADR-lite)

One entry per decision that shapes the build. **Newer entries supersede older docs where they
conflict** — implementers resolve doc conflicts by this file. Keep entries short; add, don't rewrite.

---

### ADR-001 · App license: AGPL-3.0-or-later — *2026-07-03, accepted*
The domain logic is the product; AGPL closes the SaaS-fork loophole. Full reasoning in
[`licenses.md`](licenses.md). Escape hatch: deliberate relicense down to Apache-2.0.

### ADR-002 · Custom Node/TS + PostgreSQL (Drizzle) monolith, not a BaaS — *2026-07-03, accepted*
One Postgres = one system of record and one backup domain. Supabase documented as break-glass
fallback only. Full reasoning in [`architecture-and-components.md`](architecture-and-components.md).

### ADR-003 · Hosting substrate: **NixOS VPS**, not Docker Compose — *2026-07-07, accepted*
Justin's call: NixOS for long-term maintainability (declarative config, reproducible rebuilds,
one-file rollbacks; matches homelab direction). One VPS hosts the DB and everything else.
**Supersedes** the Docker-Compose deployment sections of `architecture-and-components.md` §4 —
the *service list* there still stands; only the substrate changes. Design in [`../infra/`](../infra/).

### ADR-004 · Object storage: **Garage** (over SeaweedFS / MinIO) — *2026-07-07, accepted*
Consequence of ADR-003: Garage has first-class NixOS support and is single-node-friendly; SeaweedFS
was preferred only in the Compose world. Garage is AGPL-3.0 but contained — reached exclusively over
the S3 API, run unmodified (see `licenses.md`). MinIO remains banned (EOL).

### ADR-005 · Backups: `services.restic` + wal-g; **Backrest dropped** — *2026-07-07, accepted*
Backrest existed to give restic scheduling + a UI in the Compose world. NixOS's native restic module
is declarative scheduling already; one less service. wal-g stays for Postgres PITR.

### ADR-006 · Error tracking deferred (no GlitchTip at launch) — *2026-07-07, accepted*
GlitchTip needs its own Postgres + Redis + Celery — the heaviest ancillary on a 4 GB box and there is
no NixOS module. Launch with journald + Netdata + Uptime Kuma; revisit (hosted GlitchTip/Sentry or a
container) once real traffic exists.

### ADR-007 · Clients: PWA **and** native iOS + Android, one API contract — *2026-07-07, accepted*
Supersedes "PWA-only v1" (the store-app risks stand, but Justin wants native apps built anyway).
Division of labor: **Fable builds the PWA**, **Opus builds iOS + Android**, a smaller model executes
backend/infra tasks from [`build-plan.md`](build-plan.md). All three clients build against
[`api-contract.md`](api-contract.md) — the contract is the source of truth; nobody invents endpoints.
Auth: cookies for the PWA, bearer tokens for native (Better Auth `bearer` plugin).

### ADR-008 · Machine secrets: sops-nix; 1Password stays the human vault — *2026-07-07, accepted*
Canonical credential values continue to live in the 1Password `AgentAccess` vault (homelab
convention). The VPS consumes them via sops-nix (age-encrypted file in the repo); when a secret
changes, update 1Password first, then re-encrypt. Never commit plaintext secrets.

### ADR-009 · Postgres runs on the VPS itself (no managed DB) — *2026-07-07, accepted*
"Host the DB and everything else" on the one NixOS box. This makes backup rigor non-negotiable:
wal-g PITR + nightly restic offsite + a **calendared, actually-executed restore drill** (see
`infra/README.md` runbooks). Managed Postgres remains the fallback if operating it ever hurts.
