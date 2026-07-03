# Licensing & Compliance

This project is open source and intends to stay that way. This document records **our app's license**,
the **license of every third-party building block** we adopt, how far each license **reaches** given how
we integrate it, and the **source-available projects we deliberately avoid**.

---

## 1. The app's license: AGPL-3.0-or-later

The whole value of this app is the business logic we write — date-range boarding, oversight messaging,
first-come shift claiming, per-dog timed alerts. That is exactly the code a commercial competitor
(Gingr, Time To Pet) would lift, wrap in a hosted UI, and resell. Because they'd run it as a *service*
and never ship a binary, plain GPL wouldn't even trigger.

- **AGPL-3.0-or-later** closes that SaaS loophole: anyone running a modified version over a network must
  publish their changes. It is the only copyleft that binds a hosted-service competitor.
- **Cost:** it deters some corporate adopters and forbids casual vendoring into closed products. Neither
  matters for a solo-maintained, genuinely-open app for a home boarding business.
- **`-or-later`** keeps a forward upgrade path. If broad corporate reuse ever outranks anti-fork
  protection, relicensing down to Apache-2.0 is available — a deliberate *downgrade of protection*, not
  a neutral change.

### Why our AGPL doesn't "infect" everything

Copyleft reach depends on the integration boundary:

- **Libraries we link in-process** (Better Auth, pg-boss, sharp, React-Admin, Recharts, web-push) are
  all **permissive** (MIT / Apache / MPL / PostgreSQL), so they impose nothing on us and our AGPL
  imposes nothing new on them beyond their own permissive terms.
- **Third-party AGPL/GPL services** (DocuSeal, Garage, Backrest, Netdata, Metabase) are each run
  **unmodified as a separate network service** reached over an API. Network-boundary use does not merge
  their code with ours, so **their copyleft stays contained to their own container** — provided we do
  not fork/patch-and-distribute them. If we ever patch one, we publish that project's changes under its
  own license; our app code is unaffected.

---

## 2. Third-party license matrix

Legend — **Reach:** how far the license extends into *our* code given the integration mode.
`is_open_source = false` means a proprietary dependency or a source-available license (not OSI-approved).

| Project | License | OSS | Integration | Reach into our code | Compliance action |
|---|---|:---:|---|---|---|
| **Better Auth** | MIT | ✅ | in-process library | None (permissive) | Keep MIT notice; pin versions (fast 1.x churn); enable magic-link token hashing |
| **Centrifugo** | Apache-2.0 | ✅ | separate service | None (permissive) | Keep Apache LICENSE + NOTICE; run OSS core only |
| **web-push** | MPL-2.0 | ✅ | in-process library | File-level only — unmodified dep does not reach our source | Don't modify its files; pin version (upstream ~stale since Dec 2024); we own iOS-payload patches |
| **sharp** (libvips) | Apache-2.0 | ✅ | in-process library | None (permissive) | Keep notices; build image with libvips+libheif+libde265; verify HEIC decode in CI |
| **SeaweedFS** | Apache-2.0 | ✅ | separate service (S3) | None (permissive) | Keep LICENSE/NOTICE; primary self-host S3. **Do not use MinIO** (archived/EOL 2026-04) |
| **Garage** (alt S3) | AGPL-3.0-only | ✅ | separate service (S3) | **Contained** — reached over S3 API, run unmodified | Run stock binary; if patched, publish Garage's changes + source offer |
| **pg-boss** | MIT | ✅ | in-process (Postgres) | None (permissive) | Keep MIT notice; needs PG 13+; it creates its own schema (note for backups) |
| **DocuSeal** | AGPL-3.0-only (+ §7(b) attribution) | ✅ | separate service | **Contained** — REST/webhook + hosted signing page | Deep-link to hosted signer (embed is Pro); keep "Powered by DocuSeal" unless Pro; publish any patches |
| **React-Admin** | MIT | ✅ | in-PWA library | None (permissive) | Keep MIT notice; use free `canAccess`/`usePermissions` (ra-rbac is paid, not needed); pin v5 |
| **Recharts** | MIT | ✅ | in-PWA library | None (permissive) | Keep MIT notice; pin major version |
| **PostgreSQL + pg_trgm** | PostgreSQL | ✅ | DB engine + contrib | None (permissive) | Standard attribution; pg_trgm is bundled contrib (no separate risk) |
| **json-rules-engine** (optional) | ISC | ✅ | in-process library | None (permissive) | Keep ISC notice; keep all money math in our code, use only for condition eval |
| **supa_audit** (optional, vendored) | Apache-2.0 | ✅ | vendored PL/pgSQL | None — vendoring permissive code just makes it ours | Upstream **archived 2026-02**; we own the ~150 copied lines; apply to money/booking tables only |
| **Stripe** | proprietary | ❌ | external hosted API | None (not our code) — but not self-hostable | Wrap behind a PSP-neutral `PaymentProvider` interface; keep schema portable; enable ACH |
| **DigitalOcean Spaces** (managed S3 alt) | proprietary | ❌ | external managed service | None — but a paid cloud dependency | Only for the managed path; via S3 keys; not part of the self-host deliverable |
| **restic** | BSD-2-Clause | ✅ | standalone CLI | None (permissive) | Keep notice; never point at a live PG data dir; encrypted S3 offsite |
| **wal-g** | Apache-2.0 | ✅ | PG sidecar | None (permissive) | Keep notices; rehearse PITR restore; manage encryption keys |
| **Backrest** | GPL-3.0-only | ✅ | standalone orchestrator | **Contained** — shells out to restic, never links us | Run unmodified; lock restore UI behind Tailscale; publish if you modify+distribute |
| **pgBackRest** (fallback) | MIT | ✅ | standalone service | None (permissive) | Keep notice; heavier config than wal-g |
| **Uptime Kuma** | MIT | ✅ | standalone service | None (permissive) | Keep notice; use Push monitor as the med-alert dead-man's-switch |
| **Netdata Agent** | GPL-3.0-or-later | ✅ | standalone agent | **Contained** — never links us | Run unmodified in local/OSS mode (no mandatory cloud) |
| **GlitchTip** | MIT | ✅ | standalone service | None (permissive) | Keep notice; correct OSS substitute for the BSL Sentry *server*; budget ~0.5–1 GB RAM |
| **Metabase** (optional, later) | AGPL-3.0 | ✅ | standalone service | **Contained** if run via HTTP/iframe and never forked | Community Edition only; publish any modifications served over the network |
| **ffmpeg** (subprocess) | LGPL-2.1+/GPL-2+ (build-dependent) | ✅ | subprocess/binary | **Contained** — invoked, not linked | Prefer an LGPL build; ship as container binary; provide source offer for the exact build |
| **vanilla-cookieconsent** (optional) | MIT | ✅ | in-PWA embed | None (permissive) | Only if third-party trackers appear; may be unnecessary for a first-party PWA |

> **In-process libraries added to fill `billing` and `pwa`** (see the architecture doc): the billing
> layer is our own code (AGPL-3.0-or-later) over the Stripe wrapper; the PWA shell is
> **Vite + React + vite-plugin-pwa + Tailwind + shadcn/ui + TanStack Query**, all **MIT**, bundled into
> our client — permissive, no reach.

---

## 3. Attribution obligations (things we must actually do)

- **DocuSeal** — retain the "Powered by DocuSeal" branding on the signing page unless a Pro white-label
  license is bought (AGPL §7(b) additional term).
- **Apache-2.0 projects** (Centrifugo, sharp, SeaweedFS, wal-g) — ship their `LICENSE` and `NOTICE`.
- **MIT / BSD / ISC / MPL projects** — retain each project's copyright + license text in our
  distribution/attribution (a `THIRD-PARTY-NOTICES` file once code exists).
- **AGPL/GPL services we run unmodified** (Garage, Backrest, Netdata, Metabase) — no obligation while
  unmodified beyond not stripping their notices; **if we patch and distribute/serve a modified version,
  we must publish those changes** under that project's license and offer its source.

---

## 4. Deliberately avoided (source-available or unmaintained — do not adopt)

These came up in research and were rejected. They are **not OSI open source** (or are EOL), so adopting
them would break the open-source goal or leave us on dead code:

| Project | Why avoided |
|---|---|
| **simsustech/petboarding** | Elastic License 2.0 — source-available, **not OSS**. Reference-only for schema ideas. |
| **Directus** | Directus BSL/"MSCL" — source-available, not OSS. (React-Admin chosen instead.) |
| **Sentry (server)** | BSL/FSL — source-available. Use **GlitchTip** (MIT) with the MIT `@sentry` SDKs instead. |
| **MinIO** | Repo archived 2026-04, steered to proprietary AIStor — EOL. Use **SeaweedFS** / Garage. |
| **Invoice Ninja** | Elastic License 2.0 — source-available, not OSS. Billing is built custom instead. |
| **Meilisearch Enterprise** | BSL-1.1 Enterprise modules. Only the MIT Community core would be acceptable — and only at ~10× scale. |
| **ParadeDB pg_search** | AGPL, and as a *loaded extension* the copyleft propagates into the Postgres process — worse posture for a permissive-preferring core. |

---

*Licenses and maintenance status were verified against primary sources (repo `LICENSE` files, release
pages) during the 2026-07-03 component research. Re-verify before adopting any dependency — projects
relicense.*
