# Architecture & Components

*Derived from a multi-agent component/OSS study (2026-07-03): 30 components decomposed, per-component
open-source candidates researched, and each recommendation adversarially verified against primary
sources (repo `LICENSE` files, release pages). See the per-component appendix at the end.*

> **Substrate update (2026-07-07, ADR-003…009 in [`decisions.md`](decisions.md)):** deployment moved
> from Docker Compose to a **NixOS flake** — see [`../infra/`](../infra/). The component choices below
> stand, with three NixOS-driven adjustments: object storage is **Garage** (not SeaweedFS), Backrest is
> **dropped** (native `services.restic` replaces it), and GlitchTip is **deferred**. §4's Compose
> layout remains as rationale; `infra/README.md` is the operative server design. Native iOS/Android
> apps were also added alongside the PWA (ADR-007) — the binding HTTP surface for all clients is
> [`api-contract.md`](api-contract.md).

---

## TL;DR

Build a single **Node/TypeScript + PostgreSQL (Drizzle) monolith**, licensed **AGPL-3.0-or-later**, on
one Docker-Compose VPS. Everything that makes this app worth building — date-range boarding, oversight
messaging, first-come shift claiming, per-dog timed alerts — is custom relational logic no OSS product
ships, so we **build ~20 of 30 components on our own Postgres** and adopt only commodity plumbing that
is genuinely cheaper to run than to write:

- **Three focused services:** Centrifugo (realtime), DocuSeal (e-sign), an S3 object store (SeaweedFS/Garage).
- **In-process libraries:** Better Auth, pg-boss, sharp, React-Admin, Recharts, Postgres FTS, web-push,
  plus the PWA shell (Vite + React + Tailwind + shadcn/ui).
- **One unavoidable proprietary dependency:** Stripe, wrapped behind a thin PSP-neutral interface.

**The rule applied throughout:** *a project only "slides in" if its integration + operational cost is
lower than building the slice we need.* By that test every heavy OSS product (Chatwoot, EspoCRM/Twenty,
Frappe HR, Cal.com, Fides, Novu) failed, and the light libraries plus three focused services passed.

---

## 1. Platform spine: roll-your-own, not a BaaS

**Decision: a custom Node/TS + Postgres + Drizzle monolith. Do not adopt Supabase/Appwrite/PocketBase
as the spine.**

A BaaS covers only commodity plumbing (auth, storage, a realtime channel) while charging a real tax:
Supabase's ~10-container footprint is heavy for one small VPS and a part-time maintainer; Appwrite's
document-over-MariaDB model violates our "threads in Postgres" constraint; PocketBase is SQLite-only.
None of them ship a single line of the actual product.

Rolling our own keeps **one Postgres** as the single system of record and single backup domain, lets
bookings / threads / tasks / audit foreign-key together with plain SQL authorization (the cleanest
possible expression of *"management can read any thread"*), and keeps our AGPL license clean. This
cascades into the foundation picks: **auth = Better Auth** (in-process, users in our Postgres),
**realtime = Centrifugo** (stateless sidecar, durability in Postgres), **storage = S3 service + sharp**,
**jobs = pg-boss** (in Postgres, no Redis). Supabase (Apache-2.0) is retained only as a documented
break-glass fallback.

---

## 2. Recommended stack (all 30 components)

**Decision key:** `build` = our code on our Postgres · `library` = in-process dependency ·
`service` = separate self-hosted container · `external` = proprietary SaaS we call.

| # | Component | Decision | Project | License | Mode |
|---|---|---|---|---|---|
| 1 | Platform spine | build | Node/TS + Postgres + Drizzle monolith | AGPL-3.0-or-later | our code |
| 2 | Auth & RBAC | library | Better Auth | MIT | in-process |
| 3 | Customer & Pet CRM | build | custom (Customer/Pet/CareProfile) | AGPL-3.0-or-later | our code |
| 4 | Booking + capacity calendar | build | custom (date-range + capacity) | AGPL-3.0-or-later | our code |
| 5 | Messaging + oversight | build | custom threads (+ Centrifugo transport) | AGPL-3.0-or-later | our code |
| 6 | Realtime transport | service | Centrifugo | Apache-2.0 | sidecar |
| 7 | Notifications (push/SMS/email) | hybrid | web-push + custom orchestration on pg-boss | MPL-2.0 / MIT | library + our code |
| 8 | Media — processing | library | sharp (libvips+HEIF) + ffmpeg subprocess | Apache-2.0 / LGPL·GPL | library / subprocess |
| 9 | Media — storage | service | SeaweedFS (self-host) / Garage / DO Spaces | Apache-2.0 / AGPL-3.0 / proprietary | S3 service |
| 10 | Payments / checkout | build | custom `PaymentProvider` over Stripe | AGPL-3.0-or-later / proprietary | our code + external |
| 11 | **Billing, deposits & upsells** | **build** | **custom invoices/line-items/catalog (Medusa as ref)** | **AGPL-3.0-or-later** | **our code** |
| 12 | Workforce (open-shift claiming) | build | custom (open_shifts + claims + swaps + on_shift_now) | AGPL-3.0-or-later | our code |
| 13 | Per-dog timed tasks/meds | build | custom care-plan + pg-boss scheduling | AGPL-3.0-or-later / MIT | our code + library |
| 14 | Background jobs / scheduler | library | pg-boss (Graphile Worker = valid swap) | MIT | in Postgres |
| 15 | E-signature (waivers) | service | DocuSeal | AGPL-3.0-only (+§7b) | sidecar |
| 16 | Document & vaccination storage | build | custom doc/expiry tables + shared object store | AGPL-3.0-or-later | our code + service |
| 17 | Admin panel | library | React-Admin | MIT | in-PWA |
| 18 | Analytics & reporting | hybrid | Recharts + Postgres SQL views (Metabase optional-later) | MIT / AGPL-3.0 | library / (service) |
| 19 | Search | build | Postgres FTS (tsvector/GIN) + pg_trgm | PostgreSQL | in DB |
| 20 | Audit log & oversight trail | build | custom append-only table (+ optional supa_audit) | AGPL-3.0-or-later / Apache-2.0 | our code + vendored SQL |
| 21 | **Frontend PWA shell** | **library** | **Vite + React + vite-plugin-pwa + Tailwind + shadcn/ui + TanStack Query** | **MIT** | **in-process (client)** |
| 22 | Rate/pricing/refund engine | build | custom calculator (+ optional json-rules-engine) | AGPL-3.0-or-later / ISC | our code + library |
| 23 | Check-in / check-out state flow | build | custom state machine over reservation | AGPL-3.0-or-later | our code |
| 24 | Pet safety / compatibility flags | build | custom safety schema + do-not-pair + co-board gate | AGPL-3.0-or-later | our code |
| 25 | Incident / injury reporting | build | custom structured form → append-only record | AGPL-3.0-or-later | our code |
| 26 | Belongings & owner-supplied inventory | build | custom per-stay inventory tables | AGPL-3.0-or-later | our code |
| 27 | Onboarding & invites | library | Better Auth (magic-link + admin.createUser + org invites) | MIT | in-process |
| 28 | Waitlist & request approval | build | custom waitlist_entries + booking_requests + claim-hold | AGPL-3.0-or-later | our code |
| 29 | Backups & DR | hybrid (service) | restic + wal-g + Backrest | BSD-2 / Apache-2.0 / GPL-3.0 | sidecars |
| 30 | Observability | hybrid (service) | Uptime Kuma + Netdata + GlitchTip | MIT / GPL-3.0 / MIT | sidecars |
| — | Privacy / DSR & legal pages | build | custom export/delete/consent + static legal routes | AGPL-3.0-or-later | our code |

> **The two gaps I filled** (their research agents failed the schema retry cap, so they're my calls,
> consistent with the rest of the study):
> - **#11 Billing** — build custom. A boarding invoice is a handful of tables (`invoices`,
>   `invoice_line_items`, `credits`, `receipts`, `addon_catalog`) computed by the rate engine (#22) and
>   settled through the payments wrapper (#10). No metering/subscription complexity ⇒ Lago (AGPL, adds
>   PG+Redis+workers) and Kill Bill (Apache, JVM) are overkill; **Invoice Ninja is Elastic-2.0
>   (source-available, not OSS)** and excluded. Mine **Medusa** (MIT) for the cart/line-item and add-on
>   catalog *shape* only.
> - **#21 PWA shell** — use libraries. A **Vite + React + TypeScript SPA** with **vite-plugin-pwa**
>   (Workbox service worker/manifest/precache), **Tailwind + shadcn/ui** (Radix) for components, and
>   **TanStack Query** for data — all **MIT**. React matches React-Admin (#17) and Recharts (#18). Served
>   as static assets by the same monolith, so "one monolith" holds; iOS Declarative Web Push for staff.
>   Next.js (MIT) is the alternative if SSR/SEO is ever needed, but an authed SPA portal keeps it lighter.

---

## 3. Build vs adopt — the honest split

**Build-custom (the product, ~20):** platform spine, CRM, bookings, messaging threads +
oversight/takeover, payments wrapper, billing/upsells, workforce, per-dog tasks, audit, search,
rate/refund engine, check-in/out, safety-flags, incident reports, belongings, waitlist, DSR, document
metadata.

**Adopt-as-service (3 + storage):** Centrifugo (realtime transport with true SSE for iOS Safari behind a
proxy — non-trivial to build well), DocuSeal (legally-defensible signing + audit certificate — real
liability value), an S3 object store (durable blobs aren't worth reimplementing).

**Use-library (in-process, permissive):** Better Auth, pg-boss, sharp, React-Admin, Recharts, Postgres
FTS/pg_trgm, web-push, and the PWA toolchain.

**External SaaS (unavoidable):** Stripe — no self-hostable card processor exists by regulatory design.

**Ops/backup/observability (standalone containers):** restic + wal-g + Backrest; Uptime Kuma + Netdata +
GlitchTip.

Every whole-product OSS candidate was rejected for a concrete reason: wrong shape (Chatwoot is a support
desk, not booking-linked messaging), wrong stack + a forced sync layer (EspoCRM/Twenty/Frappe HR),
source-available (petboarding/Elastic-2.0, Directus/MSCL, Sentry-server/BSL), or a second datastore that
costs more than the tables it replaces (Fides, Novu). See [`licenses.md`](licenses.md) for the avoid list.

---

## 4. Integration architecture (one VPS)

One **Caddy** reverse proxy (auto-TLS), one **Postgres**, **no Redis**, no second app datastore, no
external IdP.

**Core containers (deliberately short — each is a maintenance cost):**

1. **caddy** — reverse proxy + TLS for the PWA, the Centrifugo WS/SSE endpoint, and the DocuSeal signing subdomain.
2. **app** (Node/TS monolith) — serves the PWA + REST/RPC API, Better Auth (in-process), sharp image
   processing (in-process), the pg-boss producer **and a pg-boss worker process** (second command/replica
   so timed alerts survive an API restart). All domain logic lives here.
3. **postgres** — the whole domain: users/sessions (Better Auth), CRM, bookings, threads + attachment
   metadata, workforce, care tasks, audit, pg-boss job tables, FTS indexes. DocuSeal points at **this**
   Postgres via `DATABASE_URL` (its own schema; one physical DB to back up). **One database, not
   per-service DBs** — the deliberate simplification that makes a solo maintainer viable.
4. **centrifugo** — stateless Go realtime sidecar (in-memory engine, no Redis). Backend authorizes each
   subscription with JWT and publishes events. **Oversight** = the backend fans each publish to an
   admin/management channel (Centrifugo has no native subscribe-to-all).
5. **object storage** — SeaweedFS (Apache-2.0) reached only over the S3 API; phones upload full-res
   photos via presigned PUT **directly to it, bypassing the app**; sharp then makes the canonical
   JPEG + variants. (Managed alt: DO Spaces.)
6. **docuseal** — separate signing service; customers deep-link to its hosted page; completion webhook
   returns the signed PDF + audit certificate into our Postgres.

**Ancillary (independent failure domains, safe to omit at day 1):** uptime-kuma, netdata, glitchtip,
backrest + restic + wal-g.

Every AGPL/GPL piece (Garage, DocuSeal, Backrest, Netdata) is reached across a network boundary and run
**unmodified**, so its copyleft stays contained to its own container.

**Representative flow — a med reminder:** the care-plan stores local time + IANA zone → the app computes
the next UTC fire → a pg-boss deferred job → at fire time the worker resolves the on-shift staffer from
the `on_shift_now` view → web-push VAPID to that phone + a Centrifugo event → a Uptime Kuma Push
heartbeat confirms the dispatch fired (dead-man's-switch).

---

## 5. Phase mapping

Aligns with the three build phases from the prior planning (P1 replace group texts · P2 money/polish · P3 workforce).

- **Phase 1 — replace the group texts (the reason the app exists).** *Foundation first:* spine, Better
  Auth + invite magic-links, CRM, Caddy + Compose skeleton, S3 + sharp HEIC pipeline, pg-boss worker.
  *Then:* owned messaging threads + oversight/takeover, Centrifugo realtime, web-push, photo report
  cards, booking (date-range + capacity) + waitlist/approval, check-in/out, pet safety-flags +
  co-boarding gate, vaccination docs + expiry reminders, append-only audit log, React-Admin console.
- **Phase 2 — money & polish.** Stripe payments (deposits + pay-invoice + ACH), rate/refund engine,
  add-on upsells + billing, DocuSeal waivers (gated to booking), incident reporting, belongings
  inventory, reporting (Recharts + SQL views), Postgres FTS search, privacy/DSR + legal pages. **Stand up
  backups + observability here (or end of P1)** — real customer + money data now exists.
- **Phase 3 — workforce.** Uber-style open-shift board + first-come claim/approval, swaps, `on_shift_now`
  view, and the per-dog timed checklists **routed to the on-shift staffer** (closes the loop with the P1
  scheduler + push). Staff-PWA polish (Declarative Web Push), staff↔customer messaging under oversight.

---

## 6. Load-bearing risks

1. **HEIC decode is not free.** sharp's prebuilt npm binary can't decode iPhone HEIC. We must build a
   custom libvips (libheif + libde265) into the Docker image and **verify HEIC→JPEG in CI**. The single
   most common upload depends on it.
2. **Timed alerts on one box.** pg-boss cron/deferred jobs fire only while a worker is live; a reboot can
   drop a due med alert. Mitigate with an always-on worker, a **startup catch-up sweep**, and a Uptime
   Kuma Push dead-man's-switch. DST/travel bugs are likely without rigorous local-time+IANA tests.
3. **Bespoke oversight/takeover.** Centrifugo has no subscribe-to-all; the shared-channel/ACL design must
   let a manager silently join or seize a customer↔staff thread **without breaking the customer session**.
4. **Stale-but-load-bearing libs.** web-push (~last substantive commit Dec 2024) and supa_audit (archived
   2026-02) have no fast upstream — we own those patches.
5. **DocuSeal free-tier scope.** Embedded signer / white-label / PDF-DOCX endpoints are Pro. Design must
   deep-link to the hosted signer and use template-based submissions; verify this covers "sign before
   first stay" before committing.
6. **Race-safe claiming & occupancy.** First-come claim needs a unique constraint / optimistic lock;
   occupancy must be derived transactionally, not a cached counter.
7. **Backups are only as good as the rehearsal.** pg (wal-g) + media (restic) crash-consistency lives in
   thin glue — calendar and **actually run** a restore drill; offsite needs a paid S3 target.
8. **AGPL adopter friction** — accepted deliberately for anti-SaaS-fork protection; Apache-2.0 is the
   escape hatch if priorities flip.
9. **Don't over-claim immutability.** The append-only audit + hash chain deters but can't stop a
   DB-superuser (the maintainer) from rewriting history. For liability-grade signing, DocuSeal's
   certificate is the real artifact — not our audit table.
10. **Operational surface creep.** Even the "small" stack is ~6 core + ~4 ancillary containers on one VPS.
    GlitchTip (its own PG+Redis+Celery) is the heaviest ancillary — defer it or use hosted error
    tracking if RAM is tight.

---

## Appendix: per-component OSS research

For each component: the requirement, the recommendation, the candidates evaluated (with verified SPDX
license, whether OSI-open, integration mode, and a 0–100 fit score for *this* business), and the
adversarial verifier's final call, including any license corrections and missed options.

### 1. `platform-spine` — Backend platform spine (BaaS vs roll-your-own)

**Requirement.** The core Postgres + auth + object storage + realtime layer. Decide: adopt a self-hostable BaaS (Supabase/Appwrite/Pocketbase/Nhost) that bundles DB+auth+storage+realtime+row-level-security, vs roll a Node/TS + Postgres monolith. This decision cascades into auth/realtime/media/storage picks.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Supabase](https://github.com/supabase/supabase) | Apache-2.0 | ✅ | separate-service | 78 | Native Postgres (our threads/bookings/oversight live in real SQL), auth with sessions/JWT, S3-style object storage for full-res photos, websocket Realtime (typing/read-receipt/presence-quality), Row-Level-Security to express 'management … |
| [Node + PostgreSQL + Drizzle (roll-your-own monolith)](https://github.com/drizzle-team/drizzle-orm) | Apache-2.0 | ✅ | library | 85 | Full control over the exact hard-constraint logic: owned message threads in our Postgres, management take-over/oversight of any conversation via plain SQL/authorization, date-range reservations with capacity, Uber-style shift claim+appro… |
| [Appwrite](https://github.com/appwrite/appwrite) | BSD-3-Clause | ✅ | separate-service | 62 | Bundles auth, storage, realtime, functions, and even a Messaging product and MCP servers — broad feature surface from one self-hosted stack. Permissive BSD license, no reach as a service. Built-in console/admin UI. — *gaps:* Its 'databas… |
| [PocketBase](https://github.com/pocketbase/pocketbase) | MIT | ✅ | library | 55 | Lowest operational burden of any candidate — one binary, trivial to run/back up on a tiny VPS, ideal for a solo part-timer. Built-in auth, storage, realtime, and admin UI. Go-extensible for custom endpoints (shift claim, booking, alert r… |

**Verified verdict.** Recommendation stands. Supabase's claimed Apache-2.0 is accurate, it is actively maintained and genuinely self-hostable with no paid-cloud lock-in, and its fit is honestly scored (commodity plumbing only; zero business-logic coverage). The hybrid verdict — roll a custom Node/TS + Postgres + Drizzle monolith for bookings/workforce/oversight-messaging and pull in permissive commodity blocks (Auth/GoTrue or Lucia/better-auth, MinIO/S3, Centrifugo/Soketi or Postgres LISTEN/NOTIFY), with Supabase as the batteries-included adopt-as-service fallback — is the right call for a solo part-time maintainer on one small VPS. No clearly-better OSS option was missed; the natural lighter contender, Directus, is BSL and correctly excluded.


### 2. `auth` — Identity, Auth & RBAC

**Requirement.** Email/phone login, password reset, magic links, 3 roles (customer/staff/manager) with fine-grained permissions, staff invite flow, session management, secure. Must integrate cleanly with a Node/PWA app; self-hostable.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Better Auth](https://github.com/better-auth/better-auth) | MIT | ✅ | library | 88 | Email/password, magic links, password reset, phone/OTP (plugin), session management, email verification, invite/organization flows, admin plugin + organization plugin for role assignment and permission checks. Runs IN our Node process wi… |
| [Authentik](https://github.com/goauthentik/authentik) | MIT | ✅ | separate-service | 62 | Full SSO/OIDC/SAML, MFA, passkeys, user lifecycle, invite flows, policy engine. Already self-hosted by this team — zero new-tech learning for the operators. Great as the STAFF/MANAGER SSO source federated into the app via OIDC. — *gaps:*… |
| [SuperTokens](https://github.com/supertokens/supertokens-core) | Apache-2.0 | ✅ | separate-service | 66 | Email/password, passwordless/magic link, phone OTP, sessions, roles & permissions, Node SDK integrates with a Node/PWA app; data stays in your DB. Solid feature coverage for the 3-role model. — *gaps:* Requires running a separate Java 'c… |
| [Zitadel](https://github.com/zitadel/zitadel) | AGPL-3.0-only | ✅ | separate-service | 55 | Enterprise-grade IdP with built-in orgs/projects/roles RBAC, OIDC federation, MFA/passkeys, invite flows, audit. Would technically satisfy login + a role model. — *gaps:* AGPL-3.0 core — contained when run as a separate service, but sign… |

**Verified verdict.** CONFIRM. Better Auth (MIT, actively maintained, self-hostable in-process library over your own Postgres) is the right top pick — it satisfies the owned-identity constraint that owned in-app messaging and per-dog task routing depend on, adds no extra stateful service for the solo maintainer, and its admin/organization/magic-link/phone-OTP/OIDC surface covers the requirement natively. License and maintenance verified against primary sources; fit is honest. Adjustments: budget for 1.x API churn given the release cadence, and treat the 'federate staff to existing Authentik' half of the hybrid as optional — customers and most likely staff should just use Better Auth email/magic-link directly rather than standing up Authentik for this. No clearly-better OSS option was missed for a library-first, own-your-users approach.


### 3. `crm` — Customer & Pet CRM

**Requirement.** Customer records; multiple pets per customer; rich pet care profiles (breed, feeding schedule, medications, vet + emergency contacts, behavior notes, vaccination records, photos); notes/tags; timeline. Management-facing.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Custom-on-Postgres (own domain schema, no CRM framework)](https://github.com/prisma/prisma) | Apache-2.0 | ✅ | library | 90 | Everything, exactly: multi-pet-per-customer, rich pet care profiles (feeding schedule, meds, vet/emergency contacts, behavior, vaccination records, photos), notes/tags, timeline. Crucially, the CRM here is the CORE domain that bookings, … |
| [EspoCRM](https://github.com/espocrm/espocrm) | AGPL-3.0-only | ✅ | separate-service | 55 | Its Entity Manager lets you define custom entities (Pet, Vaccination), custom fields, and relationships from an admin UI with zero code — you could model owner+pet+care-profile quickly and get generated CRUD screens, notes, tags, and an … |
| [Twenty](https://github.com/twentyhq/twenty) | AGPL-3.0-only | ✅ | reference-only | 45 | Best stack match (TypeScript + Postgres, same as our app). Custom objects/fields/views engine and a genuinely nice management-facing UI — excellent REFERENCE for how to structure a flexible-entity CRM and admin UX. — *gaps:* Heavy multi-… |
| [Monica (monicahq)](https://github.com/monicahq/monica) | AGPL-3.0-only | ✅ | reference-only | 20 | Contact records, notes, reminders, important-dates, activity timeline — the 'remember details about a relationship' pattern loosely echoes a pet care profile. — *gaps:* Purpose-built for PERSONAL relationships (friends/family), not a bus… |

**Verified verdict.** Endorse build-custom. Verified against primary sources: no open-source, self-hostable pet-boarding/kennel CRM exists, and the two generic custom-object engines (Twenty, EspoCRM, both AGPL) would still require authoring the full multi-pet/care-profile/vaccination/date-range schema while forcing a live sync layer between their DB and your booking/messaging Postgres — the worst operational liability for a solo maintainer. Build Customer/Pet/CareProfile directly in your app's Postgres via a permissive ORM (Prisma/Drizzle), Apache-2.0, and treat Twenty/EspoCRM as reference-only. Fit rating of 90 is honest.

> ⚠️ **License correction:** Top pick is your own code (Apache-2.0 is a valid self-chosen license) — confirmed. Two candidate corrections: Twenty is AGPL-3.0-OR-LATER plus a proprietary Enterprise commercial component (open-core), not "AGPL-3.0-only"; EspoCRM (AGPL-3.0, confirmed) as of v10 supports PostgreSQL 15+, so it does NOT strictly require a second DB engine.


### 4. `booking` — Booking / reservation engine + capacity calendar

**Requirement.** DATE-RANGE boarding/daycare reservations with per-day capacity limits; customer booking REQUESTS + admin approve/deny/modify; service types (boarding/daycare/grooming); availability view. NOTE most OSS booking tools are appointment-slot based (Cal.com/Easy!Appointments) which is a poor fit for date-range capacity — assess honestly.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [simsustech/petboarding](https://github.com/simsustech/petboarding) | Elastic-2.0 | ❌ | reference-only | 45 | Near-perfect DOMAIN fit: date-range boarding bookings with double-booking/capacity warnings, distinct boarding vs daycare service types, customer-submitted booking requests with admin approve/deny + email notifications, daycare prepaid s… |
| [QloApps (Hotel Commerce)](https://github.com/Qloapps/QloApps) | OSL-3.0 | ✅ | fork | 35 | The only mature OSS candidate with genuine date-RANGE reservation semantics: per-room-type inventory/availability across nights, capacity limits, seasonal pricing, booking management dashboard, guest website + booking engine + PMS. Conce… |
| [Cal.com / cal.diy](https://github.com/calcom/cal.diy) | MIT | ✅ | reference-only | 20 | Polished self-hosted scheduling: availability, booking requests, confirmations, notifications, calendar UI, team roles. Clean modern TS/Postgres stack that matches ours. — *gaps:* Fundamental paradigm mismatch: it is an appointment-SLOT … |
| [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | GPL-3.0-only | ✅ | reference-only | 15 | Simple self-hosted appointment scheduler: services, providers, customer self-booking, admin calendar, availability windows, API/SDK. — *gaps:* Same slot-based paradigm mismatch as Cal.com and even less capacity/range support — designed a… |

**Verified verdict.** build-custom confirmed. Date-range reservations with per-day capacity are a few tables plus an overlap query and status/service_type enums, sharing auth/messaging/ORM with the rest of the Node/Postgres app — far lower solo-maintainer burden than forking a PHP hotel monolith (QloApps or the missed HotelDruid) or running a mismatched slot scheduler. Mine both simsustech/petboarding and HotelDruid as reference-only inspiration; adopt neither.

> ⚠️ **License correction:** confirmed — Elastic License v2 (SPDX: Elastic-2.0), source-available, NOT OSI-approved open source

> 🔎 **Missed option:** HotelDruid (AGPL-3.0, PHP, active v3.0.8 Dec 2025) — a truly-OSS date-range daily-rental PMS with per-room-type capacity and public availability pages; research listed QloApps but not this. Not clearly better: same standalone-PHP-monolith paradigm mismatch as QloApps (no staff shifts, per-dog tasks, or owned messaging), so it's reference-only, not a slide-in.


### 5. `messaging` — Owned in-app messaging + oversight

**Requirement.** Threaded customer<->staff messaging stored in OUR Postgres; attachments (photos); read receipts + typing indicators; realtime; MANAGER can view and TAKE OVER any thread. Must be embeddable in our PWA (not a separate chat product users log into). Oversight/takeover is the differentiator.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Centrifugo](https://github.com/centrifugal/centrifugo) | MIT | ✅ | library | 80 | The realtime slice for a custom build: WebSocket fan-out, presence, typing indicators, delivery/read-receipt signaling, live thread updates, push of new-message events. MIT with no copyleft reach into our app and no cloud dependency. Tin… |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | MIT | ✅ | reference-only | 55 | Conceptually the closest off-the-shelf match: agent<->customer conversations, team inbox, conversation assignment (a form of takeover), embeddable website widget, attachments/photos, canned responses, and Postgres-backed storage that you… |
| [Tinode](https://github.com/tinode/chat) | GPL-3.0-only | ✅ | separate-service | 45 | Purpose-built IM primitives we'd otherwise build: P2P + group topics, presence, typing indicators, read/delivery receipts, attachments, and a JS SDK to embed in the PWA. Lightweight Go backend is small-VPS friendly. Run as a separate ser… |
| [Matrix / Synapse (+ Element)](https://github.com/matrix-org/synapse) | AGPL-3.0-only | ✅ | separate-service | 22 | Robust realtime messaging with attachments, receipts, typing, and mature clients; run as a separate service so AGPL is contained to that service (we don't distribute modified Synapse). Federation and scale far exceed our needs. — *gaps:*… |

**Verified verdict.** Endorse: build the messaging domain custom on Postgres and use Centrifugo as the realtime transport sidecar. One correction — Centrifugo is Apache-2.0, not MIT (still fully OSS, zero copyleft reach as a separate process). Actively maintained (v6.8.4, Jun 30 2026), self-hostable as one Go binary in Docker Compose on a DO-class VPS with no cloud dependency or user caps. Rejections of Matrix/Synapse (AGPL + E2EE vs mandatory oversight), Rocket.Chat (EE-gated audit + user caps), and Chatwoot (wrong product shape) are sound. No clearly-better OSS missed.

> ⚠️ **License correction:** Apache-2.0, not MIT. The repo LICENSE is the Apache License 2.0 (copyright 2023 Centrifugal Labs LTD). Centrifugo was MIT in early versions but relicensed to Apache-2.0. Practical impact is nil: both are OSI permissive with no copyleft reach, so the "zero copyleft into our open-source app" conclusion holds. Fix the SPDX in the report.

> 🔎 **Missed option:** none clearly better. Soketi (MIT, Pusher-protocol) and plain Postgres LISTEN/NOTIFY + native WebSockets are viable lighter transport alternatives, but neither is decisively superior; Centrifugo adds JWT auth, presence, history, and channel semantics out of the box, better for a solo maintainer. No OSS product models booking-linked oversight/takeover, so build-custom for the domain is correct.


### 6. `realtime` — Realtime transport

**Requirement.** Push live updates to PWA: new messages, typing, photo posted, shift claimed, booking status. Self-hostable, works behind a VPS reverse proxy, iOS Safari friendly (SSE fallback).

**Recommendation:** `adopt-as-service`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Centrifugo](https://github.com/centrifugal/centrifugo) | Apache-2.0 | ✅ | separate-service | 90 | Purpose-built user-facing pub/sub messaging server. Native transports cover exactly our need: WebSocket AND Server-Sent Events (EventSource) AND HTTP-streaming, so iOS Safari gets a first-class SSE/HTTP-streaming fallback when WS is bloc… |
| [Mercure](https://github.com/dunglas/mercure) | AGPL-3.0 | ✅ | separate-service | 80 | SSE-native by design — the single most iOS-Safari-friendly transport, works cleanly behind any HTTP reverse proxy with no WebSocket upgrade concerns. Dead-simple mental model: backend POSTs an update to a topic, subscribed browsers recei… |
| [Socket.IO](https://github.com/socketio/socket.io) | MIT | ✅ | library | 72 | MIT library that embeds directly in a Node backend — zero extra service, lowest deploy footprint if our app server is Node. Bidirectional out of the box: rooms map to threads/bookings, server can broadcast to a management 'oversight' roo… |
| [Soketi](https://github.com/soketi/soketi) | AGPL-3.0 | ✅ | separate-service | 45 | Self-hostable Pusher-compatible WebSocket server; if we ever used a Pusher-protocol client (e.g., Laravel Echo / pusher-js) it's a drop-in. Runs as its own container behind the proxy. AGPL contained to the service when run unmodified. — … |

**Verified verdict.** ADOPT-AS-SERVICE Centrifugo, confirmed. Apache-2.0 verified at source, released within days (v6.8.4, 2026-06-30), self-hostable on one DO-class VPS via a single Docker image with the in-memory engine (no Redis, no cloud). Uniquely covers WebSocket + HTTP-streaming + true SSE, meeting the iOS-Safari SSE-fallback constraint that rules out Socket.IO, under a permissive license that beats AGPL Mercure/Soketi. No better OSS option missed. Build correction: wildcard channels for management oversight is not native; fan out each backend publish to a management channel (or subscribe management per-thread).


### 7. `notifications` — Multi-channel notifications (push + SMS nudge + email + orchestration)

**Requirement.** Web Push (Declarative for iOS 18.4+, FCM/WebAPK for Android), SMS nudge links (Twilio toll-free), transactional email; an orchestration layer that routes an event to the right channel per user + handles preferences, digests, and escalation (e.g. unclaimed shift -> SMS). Self-hostable orchestration preferred.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [web-push (web-push-libs/web-push)](https://github.com/web-push-libs/web-push) | MPL-2.0 | ✅ | library | 90 | The actual browser delivery primitive our PWA needs: generate VAPID keys, encrypt payloads, POST to the browser push service. Works for iOS 16.4+/18.4 Declarative Web Push (endpoint is Apple's push service via the standard protocol) and … |
| [Novu (novuhq/novu)](https://github.com/novuhq/novu) | MIT | ✅ | separate-service | 45 | The orchestration layer itself: multi-channel workflows with branching, digest/batching engine, per-subscriber preferences (embeddable preference component), in-app Inbox, and provider fan-out for email (SendGrid/SMTP), SMS (Twilio), pus… |
| [Apprise (caronc/apprise + apprise-api)](https://github.com/caronc/apprise) | BSD-2-Clause | ✅ | separate-service | 40 | Breadth of delivery adapters (200+): SMTP email, Twilio/Vonage SMS, plus ntfy/Gotify/chat, with attachment/image support. apprise-api gives a self-hosted REST endpoint our Node backend can POST to, so we don't hand-write each provider in… |
| [ntfy (binwiederhier/ntfy)](https://github.com/binwiederhier/ntfy) | Apache-2.0 | ✅ | separate-service | 30 | Zero-friction internal alerting for STAFF/management: topic-based push, priority levels, action buttons, and it already exists in the homelab. A natural target for staff-side escalation (unclaimed-shift alert to on-call phones) via its H… |

**Verified verdict.** Endorse the hybrid recommendation as-is. web-push (MPL-2.0, confirmed) is the correct, license-safe, dependency-free choice for the browser web-push channel, and building the orchestration custom against Postgres/BullMQ is the right call for a solo maintainer on a single small VPS — Novu's Mongo+Redis+4-service footprint is disproportionate to a few-hundred-line routing layer and is honestly characterized. No clearly-better OSS option was missed. Only adjustment: treat web-push as low-activity/stable (last commit ~Dec 2024) rather than 'actively maintained,' pin the version, and budget for occasionally patching push-protocol/iOS-declarative payload details ourselves since upstream is slow.

> ⚠️ **License correction:** confirmed — LICENSE file is verbatim Mozilla Public License 2.0 (MPL-2.0). GitHub API reports NOASSERTION but that is a classifier artifact, not a relicense; the actual text is MPL-2.0. File-level copyleft only, so as an unmodified npm dependency it does not reach our app source.


### 8. `media` — Photo/video storage, processing & report cards

**Requirement.** Presigned direct uploads of full-res photos/short video from phones to object storage; server-side HEIC->JPEG conversion (iPhone uploads arrive HEIC); thumbnail/variant generation; and composing "report cards" (a curated set of a dog’s photos + notes for the day) shown in the customer portal. Self-hostable object storage option.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [sharp (libvips)](https://github.com/lovell/sharp) | Apache-2.0 | ✅ | library | 85 | In-process HEIC->JPEG conversion (the iPhone-upload core need), thumbnail/variant generation, EXIF orientation, resize/rotate/strip metadata, WebP/AVIF output. Runs inside our Node backend right after a presigned upload lands in object s… |
| [Garage (Deuxfleurs)](https://github.com/deuxfleurs-org/garage) | AGPL-3.0-only | ✅ | separate-service | 82 | Self-hosted S3-compatible object storage for full-res photos/short video on a single small VPS. Supports presigned PUT/GET so phones upload direct to storage, bypassing our app server. Single static binary = minimal ops burden for a solo… |
| [SeaweedFS](https://github.com/seaweedfs/seaweedfs) | Apache-2.0 | ✅ | separate-service | 72 | Self-hosted S3-compatible storage with presigned uploads; Apache-2.0 means ZERO license reach even if we scripted against it tightly — cleanest license of the storage options. Scales far beyond what this business needs. — *gaps:* Multi-c… |
| [imgproxy](https://github.com/imgproxy/imgproxy) | Apache-2.0 | ✅ | separate-service | 68 | On-the-fly HEIC->JPEG/WebP conversion and thumbnail/variant generation via signed URLs, as a separate self-hosted service. Would handle the same processing as sharp but out-of-process, which keeps CPU-heavy transcodes off the Node event … |

**Verified verdict.** Keep sharp as the top pick for the PROCESSING sub-component — it is the correct choice (Apache-2.0, no copyleft reach when linked, actively maintained, in-process, best-in-class libvips performance) and no clearly-better OSS was missed. One required correction to the plan: the Docker image MUST bundle a custom libvips built with libheif + libde265 to decode iPhone HEIC uploads; the default npm prebuilt binary cannot do this. Budget a Dockerfile step (or a base image with HEIF-enabled libvips) for it and verify HEIC decode in CI, since it is the load-bearing requirement. The rest of the hybrid recommendation stands: Garage as contained-AGPL S3 backend, build-custom report cards, add ffmpeg-as-subprocess for video.

> ⚠️ **License correction:** confirmed — Apache-2.0 (verified in repo LICENSE header and package metadata; SPDX Apache-2.0)


### 9. `payments` — Payments / checkout

**Requirement.** Take deposits and pay invoices by card + ACH; PCI-outsourced (hosted checkout); webhooks (idempotent, at-least-once); refunds; disputes. Stripe is the pragmatic pick — assess OSS alternatives/wrappers and whether any self-hostable processor exists (there is not, but confirm) and how to keep the integration clean/portable.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Stripe (Hosted Checkout / Payment Links / Invoicing)](https://stripe.com/docs) | proprietary | ❌ | reference-only | 88 | Everything the component requires: hosted PCI-outsourced checkout (SAQ-A), card + ACH (us_bank_account), deposits via Checkout Sessions/Payment Links, pay-invoice via hosted invoices, idempotent at-least-once webhooks (event ids + idempo… |
| [Hyperswitch (Juspay)](https://github.com/juspay/hyperswitch) | Apache-2.0 | ✅ | separate-service | 40 | Genuine Apache-2.0 OSS payment ORCHESTRATOR: unified API over 120+ processors, routing/retries, PCI-compliant vault, webhooks, refunds. Gives PSP portability (swap/route Stripe/Adyen/etc.) without changing our code. — *gaps:* Still needs… |
| [Medusa payment module (medusa-payment-stripe / AbstractPaymentProvider)](https://github.com/medusajs/medusa) | MIT | ✅ | reference-only | 35 | MIT-licensed, well-designed payment-provider ABSTRACTION (AbstractPaymentProvider: authorize/capture/refund/webhook) plus a working Stripe provider — an excellent design reference for the thin interface we should build ourselves. Same No… |
| [Lago (open-source billing)](https://github.com/getlago/lago) | AGPL-3.0-only | ✅ | separate-service | 22 | AGPL-3.0 OSS invoicing/subscription/usage billing with payment orchestration hooks into Stripe/others; could generate and track invoices if billing ever got complex. — *gaps:* Built for usage-based/subscription billing (metering, wallets… |

**Verified verdict.** Endorse build-custom. Verification confirms no viable self-hostable OSS processor was missed — none exists by regulatory design, and the named orchestrators (Hyperswitch/Apache-2.0, Lago/AGPL-3.0-only, Medusa/MIT) all sit in front of or beside a PSP rather than replacing it. Build the thin (~200-line) PaymentProvider abstraction over Stripe hosted checkout, keep the payments/payment_events schema PSP-neutral for portability, borrow Medusa's AbstractPaymentProvider interface shape as a design reference only, and shelve Hyperswitch as a future multi-PSP-routing option. Recommendation stands as written.

> ⚠️ **License correction:** confirmed — Stripe is correctly labeled proprietary (a hosted API/SDK, not self-hostable, which the research states honestly). The OSS alternatives' licenses were verified against their repo LICENSE files: Lago = AGPL-3.0-only (confirmed, matches claim), Hyperswitch = Apache-2.0 (confirmed), Medusa = MIT (as claimed). No relicensing surprises found.


### 10. `workforce` — Workforce: open-shift board, claiming & scheduling

**Requirement.** THE known gap: Uber-style OPEN shifts that staff CLAIM first-come with manager approval, auto-added to schedule; shift swaps; time-off; a staff schedule view; who-is-on-shift-now (drives task routing). Assess whether ANY OSS covers open-shift claiming or if this is custom. Be rigorous — this is the hardest-to-source component.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Frappe HR (frappe/hrms)](https://github.com/frappe/hrms) | GPL-3.0-only | ✅ | separate-service | 32 | Shift Management module with Shift Request -> manager Approve/Reject (Shift Assignment Tool) -> auto-creates Shift Assignment; leave/time-off requests; employee self-service portal; shift schedules. This is the closest OSS analog to a cl… |
| [TimeTrex Community Edition](https://github.com/aydancoskun/timetrex-community-edition) | AGPL-3.0-only | ✅ | separate-service | 22 | Employee scheduling with the ability to post/view open shifts and let employees select them; time & attendance; time-off; genuinely self-hostable Community Edition (AGPL, no mandatory cloud). — *gaps:* Enterprise HR/payroll monolith wild… |
| [Staffjoy (Suite/Chomp/Mobius)](https://github.com/Staffjoy) | MIT | ✅ | reference-only | 18 | Historically the ONLY OSS with true open-shift semantics: employees could see open shifts, claim/choose them, and swap shifts with notifications — conceptually the exact model we need. — *gaps:* Dead project (no security patches, stale d… |
| [SirChri/employee-shift-scheduler](https://github.com/SirChri/employee-shift-scheduler) | GPL-3.0-only | ✅ | reference-only | 20 | Clean self-hostable calendar/roster scheduling with a FullCalendar-based schedule view and Docker Compose deploy; usable as a UI/data-model reference for the staff schedule view. — *gaps:* By its own roadmap it has NO shift claiming, NO … |

**Verified verdict.** build-custom. Fully confirmed. All five verification axes hold: (1) Frappe HR license GPL-3.0 is correct and, as a separate service, non-infecting; (2) actively maintained (release yesterday); (3) self-hostable but only via the heavy Frappe/MariaDB/Redis stack — a genuine ops burden for a solo maintainer; (4) fit is honest-to-generous (~30%, inverted model, no claim/swap/on-shift-now); (5) no clearly-better OSS was missed. The hard constraint that who-is-on-shift-now must live in OUR Postgres to route per-dog timed med/task alerts independently forces the state into our DB, erasing any adoption savings from a foreign HR monolith. Build the small native data model (open_shifts date-range+capacity, claims with unique-constraint/optimistic-lock race guard, swaps, time_off, on_shift_now view), mining Frappe HR's approval flow and Staffjoy's claim/swap semantics as reference-only.


### 11. `tasks` — Per-dog timed med/feeding/task checklists bound to shifts

**Requirement.** Care tasks (give medication X at 8am/8pm, feed at 7am, walk at noon) defined per dog per stay, materialized into timed to-dos for the on-shift staff member, with reminders/alerts, completion logging + audit, and escalation if missed. DST-aware (store local time + zone). Likely custom on top of a job scheduler.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [pg-boss](https://github.com/timgit/pg-boss) | MIT | ✅ | library | 80 | The durable scheduling substrate for the whole feature: delayed/deferred jobs (fire med reminder at 8am/8pm), cron scheduling, automatic retries with exponential backoff (redeliver a missed push), dead-letter queues with redrive (surface… |
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT | ✅ | library | 55 | Same class of scheduling primitives as pg-boss — delayed jobs, repeatable (cron) jobs, retries with backoff, flows/dependencies — plus a mature ecosystem (Taskforce/Bull Board dashboards). MIT and used as a library, so no copyleft reach … |
| [MedTimer (Futsch1/medTimer)](https://github.com/Futsch1/medTimer) | MIT | ✅ | reference-only | 22 | A well-designed, battle-tested UX/data model for timed and interval-based medication reminders with dose history and adherence logging — a strong pattern reference for how to model med schedules, snooze/skip, and reminder history. MIT, s… |
| [remedio (mtricht/remedio)](https://github.com/mtricht/remedio) | unknown | ❌ | reference-only | 18 | A minimalist self-hosted pattern worth glancing at: supply tracking plus reminder fan-out to shoutrrr targets (ntfy/Gotify) — a clean example of decoupling 'reminder due' from 'notification delivery,' which mirrors how our alerts should … |

**Verified verdict.** Endorse build-custom with pg-boss as the durable scheduling substrate. The reasoning holds up under primary-source check: MIT confirmed, actively maintained (pushed today), fully self-hostable in-process on the existing Postgres with no cloud/Redis dependency. The fit framing is honest — pg-boss is correctly scoped to the timed-job primitive only, while the per-dog care-plan model, shift-routing resolver, DST-aware local-time+zone materializer, and audit/escalation state machine are business rules no OSS encapsulates and must be built. No whole-app OSS was wrongly missed (the med-tracker candidates are correctly reference-only). One addition: evaluate Graphile Worker alongside pg-boss before committing, since it is an equally Postgres-native MIT alternative; pg-boss remains a defensible default given its built-in cron, dead-letter/redrive, and simpler single-package API.

> 🔎 **Missed option:** Graphile Worker (graphile/worker) — MIT, Postgres-native job scheduler with cron + retries; a legitimate same-database alternative to pg-boss that research omitted (it only contrasted the Redis-backed BullMQ). Not clearly better than pg-boss for this use, but should have been in the comparison.


### 12. `jobs` — Background jobs / scheduler / queue

**Requirement.** Run timed med/task alerts, reminder nudges, Stripe reconciliation sweeps, digest emails, retries. Postgres-backed preferred (one fewer service than Redis) but assess. Durable, observable.

**Recommendation:** `use-library`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [pg-boss](https://github.com/timgit/pg-boss) | MIT | ✅ | library | 90 | Everything this component needs on the exact stack we already run. Postgres-backed (uses SKIP LOCKED for exactly-once-ish delivery), so zero extra services on the DO VPS — the queue lives in the same Postgres that holds message threads. … |
| [Graphile Worker](https://github.com/graphile/worker) | MIT | ✅ | library | 84 | Direct peer to pg-boss: high-performance Node/Postgres job queue, no Redis, MIT. Crontab-style recurring jobs with optional backfill of missed runs (nice for a solo-maintained VPS that may reboot — missed med-reminder crons can backfill)… |
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT | ✅ | library | 62 | Feature-rich and battle-tested: delayed + repeatable (cron) jobs, retries with backoff, priorities, concurrency, rate limiting, deduplication/debouncing, flows/parent-child, pause/resume. Would fully satisfy the functional requirements. … |
| [River](https://github.com/riverqueue/river) | MPL-2.0 | ✅ | reference-only | 40 | Technically excellent and the most 'observable' of the Postgres-native options: ships a real web UI, transactional enqueue (jobs commit/rollback with your DB change — best-in-class durability guarantee), periodic/cron jobs, configurable … |

**Verified verdict.** Endorse as-is: use-library, pg-boss embedded in the Node/TS app. License (MIT), maintenance (release 2026-07-02, commits 2026-07-03), and single-VPS self-hostability are all verified against primary sources. Recommendation is honest — including the critical caveat that you must do local-time+IANA→UTC conversion yourself before enqueuing timed med/feeding alerts. Graphile Worker is an equally-valid MIT fallback; either is fine. Only operational note to carry forward: ensure the worker process has an uptime alert and a startup catch-up sweep so a VPS restart doesn't silently drop a due med/task alert.


### 13. `esign` — Waivers & boarding agreements (e-signature)

**Requirement.** Customer signs a liability waiver / boarding agreement before first stay; store signed PDF + audit trail; re-sign on updates. Self-hostable e-sign.

**Recommendation:** `adopt-as-service`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [DocuSeal](https://github.com/docusealco/docuseal) | AGPL-3.0-only | ✅ | separate-service | 88 | Reusable waiver/agreement templates, embeddable or hosted signing flow, completed-document webhooks delivering signed PDF, per-submission audit trail + signing certificate, re-send/re-sign flows, REST API + webhooks. Nudge-link model (em… |
| [Documenso](https://github.com/documenso/documenso) | AGPL-3.0-only | ✅ | separate-service | 78 | Full document signing with audit trail, templates, API, webhooks, PDF certificate. Same as-a-service integration keeps AGPL contained. TypeScript codebase is the closest stack match if we ever want to fork rather than run as a black box.… |
| [OpenSign](https://github.com/OpenSignLabs/OpenSign) | AGPL-3.0-only | ✅ | separate-service | 60 | Templates, signing, audit trail, API keys + docs for integration, Docker self-host. Functionally comparable to the others for our simple waiver need. AGPL contained when run as a separate service. — *gaps:* Requires MongoDB (Parse Server… |
| [Custom signature-pad + pdf-lib](https://github.com/szimek/signature_pad) | MIT | ✅ | library | 72 | Fully in-process, no extra service, no extra datastore — lowest infra footprint. MIT libraries linked directly with zero copyleft reach; total control over the signing UX inside the PWA and over how we store the signed PDF, IP/timestamp/… |

**Verified verdict.** Adopt DocuSeal as a self-hosted separate service — recommendation stands. Two concrete corrections to bake in: (1) DEEP-LINK customers via a nudge link to DocuSeal's own hosted signing page instead of embedding the signer UI in the PWA — embedded signing is Pro-only, whereas hosted pages + REST API + webhooks are free and match our low-motivation-iOS-customer flow anyway. (2) Author the waiver as a reusable TEMPLATE in DocuSeal's UI and create submissions from that template via the free API (avoid the Pro "create from PDF/DOCX" endpoints). Consume the completion webhook for the signed PDF + audit certificate; version the template and key a "signed current waiver version?" check to bookings. Point it at our existing Postgres via DATABASE_URL. AGPL stays contained to the container; accept the "Powered by DocuSeal" attribution on the signing page (or buy Pro to remove). Documenso (also AGPL, Postgres) remains the fork-friendly TypeScript fallback.

> ⚠️ **License correction:** confirmed — AGPL-3.0-only with Section 7(b) Additional Terms (attribution rider: "Powered by DocuSeal" branding must remain unless Pro white-label is purchased). OSI-open, not source-available. Research's SPDX and the 7(b) note are both accurate.


### 14. `documents` — Document & vaccination record storage

**Requirement.** Customers upload vaccination records / vet docs; staff/management view; expiry tracking + reminders; tie to pet profile.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Custom + object storage (DigitalOcean Spaces or self-hosted MinIO)](https://github.com/minio/minio) | AGPL-3.0-only | ✅ | separate-service | 78 | Durable blob storage for vaccination photos/PDFs and full-res report-card images via presigned uploads; pairs with our own Postgres tables that own pet linkage, doc kind, expiry_date, and a daily reminder cron. S3 API is a stable library… |
| [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) | GPL-3.0-only | ✅ | separate-service | 55 | Storage + OCR + Date custom field + v2.14 'scheduled' workflow triggers that fire on a custom-field date with an offset (real expiry-reminder capability). REST API for programmatic upload. Team already runs it, so ops familiarity + a nat… |
| [Nextcloud (server)](https://github.com/nextcloud/server) | AGPL-3.0-only | ✅ | separate-service | 32 | Raw file storage + sharing; 'File Drop' external upload links let a customer upload without an account; Flow rules for basic automation. AGPL contained as a separate service. — *gaps:* No expiry-date tracking, no pet linkage, no report-c… |

**Verified verdict.** Keep build-custom on object storage — verdict confirmed. Managed path: DigitalOcean Spaces (S3 API, zero ops) is fine. Self-host path: DROP MinIO (archived/unmaintained as of 2026-04-25, EOL toward proprietary AIStor) and substitute SeaweedFS (Apache-2.0, actively maintained, S3-compatible) as the primary self-host S3 layer, or Garage (AGPL-3.0) if a leaner single-node option is preferred — both run as a separate service so any copyleft stays contained. Keep all metadata, pet linkage, expiry dates, and reminder cron in our own schema (~2 Postgres tables + daily expiry scan). Optional Paperless-ngx archival bridge remains reasonable since the team already runs it, but not as customer-facing store of record.

> ⚠️ **License correction:** SPDX values are correct (MinIO AGPL-3.0-only, Paperless-ngx GPL-3.0, Nextcloud AGPL-3.0-only). But two labeling issues: (1) The combined top-pick tag "AGPL-3.0-only, OSS=true" conflates the two options — DigitalOcean Spaces is a PROPRIETARY managed S3 service (not AGPL, not OSS), while self-hosted MinIO is AGPL-3.0. (2) MinIO's AGPL is now moot for OSS purposes: the minio/minio repo was archived 2026-04-25 and marked "no longer maintained," steering users to proprietary AIStor.

> 🔎 **Missed option:** For the self-host S3 substrate: SeaweedFS (Apache-2.0, actively maintained v4.37 Jun 2026, S3-compatible), RustFS (Apache-2.0, positioned as direct MinIO successor), and Garage (AGPL-3.0, active, single-small-server friendly). SeaweedFS/RustFS are permissive — a better license posture than MinIO. Research anchored on MinIO without catching its archival.


### 15. `admin` — Admin panel / internal tooling

**Requirement.** Fast CRUD + ops surfaces for management: manage customers/pets/bookings/staff, moderate content, override records, view audit. Ideally auto-generated from the data model to save build time; must respect our RBAC. Assess admin-panel frameworks vs building bespoke management screens.

**Recommendation:** `use-library`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [React-Admin](https://github.com/marmelab/react-admin) | MIT | ✅ | library | 82 | Auto-generated list/edit/create/show CRUD for customers/pets/bookings/staff from our own API; built-in role-based access control (permissions/canAccess) that can honor our RBAC; drop-in custom React pages for bespoke oversight (conversat… |
| [Refine](https://github.com/refinedev/refine) | MIT | ✅ | library | 76 | Same library-in-our-app model as React-Admin but more headless/unopinionated — full layout control to match our PWA look; access-control provider for RBAC; CRUD hooks over our own API; custom routes for oversight screens. — *gaps:* More … |
| [AdminJS](https://github.com/SoftwareBrothers/adminjs) | MIT | ✅ | library | 74 | Fastest zero-config path to CRUD — reads our ORM schema and generates create/read/update/delete + validation with almost no code; mounts as a route inside our existing Node backend (no separate service); custom actions/components possibl… |
| [Directus](https://github.com/directus/directus) | MSCL | ❌ | separate-service | 45 | Powerful auto-generated admin/data studio over a Postgres DB with roles/permissions and an audit/activity log — quick management CRUD surface if run as a separate container. — *gaps:* NOT open source (source-available MSCL) — conflicts w… |

**Verified verdict.** Confirm use-library with React-Admin (MIT, maintained, self-hostable, honest fit) in the hybrid pattern. Minor correction: fine-grained RBAC (ra-rbac) is paid Enterprise; MIT core ships only canAccess/usePermissions, adequate for our 3 roles. Refine (MIT) is a valid second choice.


### 16. `reporting` — Analytics & reporting

**Requirement.** Occupancy/capacity, revenue, deposits outstanding, staff hours, upsell attach rate. Lightweight — could be SQL + charts or an embedded BI tool. Self-hostable.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Recharts (+ Postgres SQL views) — build-custom path](https://github.com/recharts/recharts) | MIT | ✅ | library | 88 | All required metrics (occupancy/capacity by date range, revenue, deposits outstanding, staff hours, upsell attach rate) as SQL aggregations over the app's own Postgres, rendered inline in the existing management PWA view. Reuses app auth… |
| [Metabase (Open Source / Community Edition)](https://github.com/metabase/metabase) | AGPL-3.0 | ✅ | separate-service | 72 | Every required metric plus real value the custom path lacks: point-and-click ad-hoc exploration for non-technical owners, saved questions/dashboards, scheduled email/Slack digests (deposits-outstanding, weekly revenue), and signed-iframe… |
| [Grafana (OSS)](https://github.com/grafana/grafana) | AGPL-3.0 | ✅ | separate-service | 55 | Can query Postgres and chart it; already familiar in the user's homelab (CT 106). Lightweight-ish and self-hostable with no mandatory paid cloud. Good if any metric is genuinely time-series (e.g., occupancy over time). — *gaps:* Built fo… |
| [Cube (Cube Core)](https://github.com/cube-js/cube) | Apache-2.0 | ✅ | separate-service | 45 | Centralized, reusable metric definitions (occupancy, attach rate, etc.) exposed as an API — nice if many independent consumers needed the same governed metrics. Permissive license, no copyleft concern. — *gaps:* Solves a problem this sin… |

**Verified verdict.** Endorse as-is. Build-custom with SQL views/materialized views + an MIT React chart library (Recharts) embedded in the management view is the right v1 answer for this tiny, well-bounded reporting surface — no new service, reuses existing auth/Postgres/deploy, zero copyleft reach for the OSS product. License claims all verify against primary sources (Recharts MIT; Metabase/Grafana AGPL-3.0; Cube Apache-2.0). Keep Metabase as an optional adopt-as-separate-container ONLY if owners later want genuine self-service ad-hoc BI or scheduled email digests, with its AGPL contained by never vendoring its code. Do not adopt Grafana (wrong tool for tabular financials) or Cube (no viz, solves a multi-consumer metrics problem this single team lacks). Pin the Recharts major version.


### 17. `search` — Search (customers / pets / bookings)

**Requirement.** Fast fuzzy search across customers, pets, bookings, message threads for staff/management. Postgres FTS may suffice; assess dedicated engines only if warranted.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [PostgreSQL full-text search (tsvector/tsquery + pg_trgm)](https://github.com/postgres/postgres) | PostgreSQL | ✅ | library | 92 | Covers essentially all requirements at this data scale (dozens-hundreds of customers/pets/bookings + message threads). FTS over names/notes/thread bodies via GIN(tsvector); pg_trgm gives fuzzy/typo tolerance and 'search-as-you-type' pref… |
| [Meilisearch](https://github.com/meilisearch/meilisearch) | MIT | ✅ | separate-service | 70 | Best-in-class typo tolerance and instant search UX with almost no tuning; trivial to point at customers/pets/bookings/threads indexes and get iMessage-search-quality feel. Runs as a separate Docker service, so its license reach is a non-… |
| [Typesense](https://github.com/typesense/typesense) | GPL-3.0-only | ✅ | separate-service | 60 | Comparable instant/typo-tolerant search and faceting to Meilisearch; clean SDK; single binary is easy to run on a small VPS. Because we'd run it as a SEPARATE network service and only talk to it over its REST API (no linking/vendoring it… |

**Verified verdict.** Keep build-custom on Postgres FTS (GIN tsvector) + pg_trgm for fuzzy matching. Verified: PostgreSQL License is permissive/OSI-approved with no propagation, it's the DB they already self-host (no second stateful service, no paid cloud), and maintenance is a non-issue. Fit for a home-boarding operation's row counts is honest, and search is a supporting capability that benefits from living in the same transactionally-consistent, row-level-access-controlled database as bookings/threads. Do NOT adopt a dedicated engine for v1; if relevance/typo quality ever becomes a real complaint or data grows ~10x, revisit Meilisearch's MIT Community Edition as a separate Docker service (staying clear of its BSL Enterprise modules) — not Typesense (GPL-3.0, acceptable only as a separate daemon) and not ParadeDB (AGPL, in-process).

> ⚠️ **License correction:** confirmed — PostgreSQL License (OSI-approved, permissive BSD/MIT-like, zero copyleft propagation). pg_trgm ships as a bundled contrib extension under the same PostgreSQL license, so no separate license risk. Secondary claims also verified: Typesense server = GPL-3.0 (client libs Apache-2.0); Meilisearch = dual-licensed as of Aug 2025, MIT Community core + BSL-1.1 Enterprise Edition (source-available, correctly flagged).

> 🔎 **Missed option:** none — the only near-miss is ParadeDB's pg_search (BM25 in Postgres), but as a loaded/vendored extension it is AGPL-3.0 (copyleft propagates into the DB process), which is strictly worse for a permissive-preferring solo maintainer and unnecessary at dozens-to-low-hundreds of rows. No clearly-better OSS option was missed.


### 18. `audit` — Audit log & oversight trail

**Requirement.** Immutable-ish log: who edited a booking, who took over a conversation, who completed/missed a med task, payment events. Powers the management oversight requirement and dispute resolution.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| Custom append-only Postgres audit table (build-custom) | N/A | ✅ | library | 90 | Every domain event the oversight requirement needs: booking edits, conversation takeover, med/feeding task complete/missed, shift-claim approvals, payment webhook events; captures app actor_user_id + role, correlation id, before/after js… |
| [supa_audit (Supabase Generic Table Auditing)](https://github.com/supabase/supa_audit) | Apache-2.0 | ✅ | vendor-code | 55 | Drop-in trigger-based data audit for the DB-mutation subset (who changed a booking row, old vs new values as JSONB, incl. TRUNCATE); efficient history queries by record_id; good defense-in-depth safety net for booking/capacity and money … |
| [pgMemento](https://github.com/pgMemento/pgMemento) | LGPL-3.0-only | ✅ | vendor-code | 45 | Richer than supa_audit: transaction metadata, delta-only JSONB logging, DDL/schema versioning, and algorithms to restore/repair past revisions — nice for full data-history forensics. — *gaps:* Heavyweight for our needs; still row/data-ce… |
| [temporal_tables (arkhipov)](https://github.com/arkhipov/temporal_tables) | BSD-2-Clause | ✅ | reference-only | 35 | Automatic system-versioned row history for tables (before-image of every row over time) — useful conceptual pattern for booking history. — *gaps:* Records WHAT changed, never WHO or WHY (no actor, no domain action); C extension install/c… |
| [pgAudit](https://github.com/pgaudit/pgaudit) | PostgreSQL | ✅ | reference-only | 25 | Best-in-class DB-role-level session/object audit logging for compliance where the requirement is 'log all SQL to the server log.' — *gaps:* Logs to Postgres server text logs, NOT a queryable table — cannot power an in-product oversight/d… |

**Verified verdict.** Endorse build-custom. A single append-only Postgres table (id, occurred_at timestamptz + tz, actor_user_id, actor_role, action enum, subject_type/id, before/after jsonb, correlation_id) written from the same service transactions that mutate bookings/messages/tasks is the correct, lowest-moving-parts choice — it captures the domain/intent-level events (conversation takeover, missed-med-task-by-deadline, shift-claim approval, webhook payment events) that no off-the-shelf row-diff tool can see. Fit is honest, not overstated. Take the hybrid: copy supa_audit's Apache-2.0 PL/pgSQL triggers onto ONLY booking/capacity + money tables as a 'did the DB actually change outside the app' safety net — but pin/vendor it knowing the upstream is archived (no updates coming). Skip pgAudit (server-log/role-keyed, useless for an in-product dispute timeline) as research correctly says. De-emphasize the hash-chain: keep append-only + actor columns as the load-bearing feature; add the hash chain only if cheap, and don't market it as true immutability on a box where the maintainer is also DB superuser.

> ⚠️ **License correction:** Build-custom pick is N/A (our own code). Candidate licenses verified against repos: supa_audit = Apache-2.0 (confirmed), pgMemento = LGPL-3.0-only (confirmed), temporal_tables = BSD-2-Clause (plausible, not independently re-checked), pgAudit = PostgreSQL license (confirmed, standard for this project). All listed as OSI-approved open source; none are BSL/SSPL/source-available. No relicensing surprises.


### 19. `rate-policy-engine` — Rate, pricing & cancellation/refund policy engine

**Requirement.** Compute a stay's price from configurable rules — per-night base rate, per-dog and multi-dog discounts, size/breed tiers, holiday/peak surcharges, add-on line items, deposit percentage, plus a cancellation/refund policy (tiered by days-before-arrival) that decides how much of a deposit/invoice is forfeited or refunded when a date-range reservation is cancelled or shortened.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [json-rules-engine (CacheControl)](https://github.com/CacheControl/json-rules-engine) | ISC | ✅ | library | 55 | Declarative condition->event evaluation from JSON rules stored in our Postgres: size/breed tiers, multi-dog thresholds, holiday flags, and days-before-arrival cancellation tiers can each be expressed as ALL/ANY conditions emitting an eve… |
| [GoRules Zen Engine](https://github.com/gorules/zen) | MIT | ✅ | library | 48 | Stronger declarative layer than json-rules-engine: decision TABLES map cleanly to a rate matrix (size x season -> rate) and to cancellation tiers (days-before -> refund %), and JDM files are owner-editable. Actively maintained, MIT, self… |
| [rules-machine (elite-libs)](https://github.com/elite-libs/rules-machine) | BSD-3-Clause | ✅ | library | 35 | Pure-TS in-process rules engine with math/array helpers that could express pricing arithmetic and cancellation tiers inline, permissive BSD-3, trivial to embed and unit-test. — *gaps:* Very low adoption (~56 stars) — risky for money-path… |

**Verified verdict.** Endorse build-custom. Write the deterministic pricing/refund calculator as ~200-400 lines of unit-tested TypeScript in one reviewable module; do NOT stand up a rules-engine service. Adopt json-rules-engine (ISC, pure JS, actively maintained through Feb 2026, trivially self-hostable as an in-process library, rules persisted as JSON in Postgres) OPTIONALLY and only if/when owner-editable rule tables become a real need — and confine it to condition evaluation, keeping all money arithmetic (rounding, currency, proration, audit trail) in your own code. License poses zero threat to the open-source goal.


### 20. `checkin-checkout` — Check-in / check-out & occupancy state flow

**Requirement.** Drive the physical arrival/departure lifecycle for a date-range reservation: staff mark a dog checked-in (recording actual vs. scheduled arrival, intake condition/photos, belongings received) and checked-out (return belongings, capture any balance due), transitioning the reservation through states that keep the live occupancy count and current-guests roster accurate for the on-shift staff.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| Custom state machine over the booking record (in-app, Postgres) | MIT | ✅ | library | 95 | Full lifecycle: requested/approved/checked-in/checked-out/no-show/cancelled transitions with guards; actual vs scheduled arrival timestamps; intake condition/photos via media FK; belongings JSON; balance-due capture at checkout; live occ… |
| [XState (statelyai/xstate)](https://github.com/statelyai/xstate) | MIT | ✅ | library | 55 | Clean, testable modeling of the reservation transition graph with guards/actions/entry-exit effects; visualizable statecharts; MIT vendors freely into an open-source app — *gaps:* Covers zero domain requirements (no occupancy roster, no … |
| [simsustech/petboarding](https://github.com/simsustech/petboarding) | Elastic-2.0 | ❌ | reference-only | 30 | Closest domain analog: booking request -> admin approve/reject with email, price calc, double-booking warnings, day/week/month occupancy overviews — useful as a feature/UX reference — *gaps:* NOT open source (Elastic License v2 is source… |
| [kristenstoeckeler/pet-hotel](https://github.com/kristenstoeckeler/pet-hotel) | proprietary | ❌ | reference-only | 10 | Has an explicit check-in/check-out button flow, pet registration with photos, client management — confirms the shape of a minimal check-in/out UI — *gaps:* No LICENSE file = all-rights-reserved (unusable to copy); student demo quality, n… |

**Verified verdict.** build-custom — CONFIRMED. Implement as a status column + server-enforced transition guards over the reservation record in Postgres; derive live occupancy transactionally rather than caching a counter. Skip XState for v1 (optional, not load-bearing). Treat petboarding as reference-only due to Elastic-2.0. No viable drop-in OSS was missed.

> ⚠️ **License correction:** confirmed — verified against repo LICENSEs: XState = MIT (statelyai/xstate LICENSE, Copyright 2015 David Khourshid); simsustech/petboarding = Elastic-2.0 (ELv2), correctly flagged as source-available / NOT OSS. Custom pick is our own code (MIT). All claimed licenses accurate.


### 21. `pet-safety-flags` — Dog compatibility & behavioral safety flags with co-boarding gating

**Requirement.** Store structured behavioral/safety attributes per dog (aggression, resource-guarding, escape risk, intact status, do-not-pair-with specific dogs, spay/neuter, vet/emergency contact) and enforce them as gates — warn or block when the booking/assignment engine would place incompatible dogs together, and surface the flags prominently to on-shift staff.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [simsustech/petboarding](https://github.com/simsustech/petboarding) | Elastic-2.0 | ❌ | reference-only | 18 | Real, self-hostable, Docker-Compose pet-boarding domain model in the exact stack we'd target (Vue/TS/Postgres): customers, pets, pet info cards, date-range boarding bookings and daycare. Useful as a reference for how to shape the pet/boo… |
| [laurakoco/dog-daycare-database](https://github.com/laurakoco/dog-daycare-database) | NOASSERTION | ❌ | reference-only | 10 | Documents a plausible daycare relational schema with emergency-contact table (emerg_t) and a vaccination junction (dog_vaccine_t / vaccine_t incl. rabies, kennel cough) — a small starting checklist of per-dog medical/contact fields we'll… |

**Verified verdict.** Uphold build-custom. Verified against primary sources: petboarding's LICENSE is genuinely Elastic-2.0 (not OSS), it is actively maintained (v0.7.1, June 2026) and Docker self-hostable, but it does NOT implement dog-to-dog incompatibility, behavioral safety attributes, or co-boarding gating — the fit is honest, not overstated. No OSI-licensed project models this domain at all. The safety schema + do-not-pair edge table + evaluateCoBoardingConflicts predicate wired into the booking-capacity and staff-assignment/check-in paths is unavoidably custom and lives inside our own logic (near-zero added VPS/operational cost). Borrow only the vaccination/emergency-contact field list from the two references under our own OSI license; build everything else.


### 22. `incident-reporting` — Incident / injury / medical-event reporting

**Requirement.** Let staff file a structured incident report (dog(s) involved, category, severity, timestamped narrative, photos/video, actions taken, whether owner/vet was contacted) that auto-notifies management, optionally pushes a customer-facing summary, and is retained immutably for liability — distinct from routine report cards.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Custom](https://github.com/OpnForm/OpnForm) | AGPL-3.0-or-later | ✅ | reference-only | 78 | domain linkage — *gaps:* build form ourselves |

**Verified verdict.** Uphold build-custom. This is domain-specific logic tightly coupled to the app's dogs/bookings/on-shift-staff/owned-messaging schema; no OSS incident-reporting project slides in (the ones that exist are security-IR platforms). Build it as a structured form writing to an immutable/append-only Postgres record, reusing the already-planned management-notify and customer-summary/push paths. Fix the empty "test" reasoning in the research doc.

> ⚠️ **License correction:** confirmed — no external dependency; the custom code is intended AGPL-3.0-or-later, an OSI-approved copyleft license, consistent with the project's OSS goal. Running the app as a single service keeps AGPL contained to our own service.


### 23. `belongings-supplies` — Belongings & owner-supplied food/medication inventory

**Requirement.** Track items an owner drops off with each dog — food (type, portion, quantity/days-of-supply remaining), medications (name, dose, schedule, count remaining), and personal items (bed, toys, leash) — so staff know what to feed/administer, get low-supply warnings, and can confirm everything is returned at check-out.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Grocy](https://github.com/grocy/grocy) | MIT | ✅ | reference-only | 32 | Best conceptual match for the SUPPLY-depletion side: stock model tracks quantity, portions, best-before/expiry dates, 'days until stock depleted', min-stock warnings, and open/consume actions — maps well to food days-of-supply and med co… |
| [Snipe-IT](https://github.com/grokability/snipe-it) | AGPL-3.0-only | ✅ | reference-only | 25 | Its check-out / check-in model with acceptance/EULA, timestamped transactions, and consumables/components maps to the 'confirm everything returned at check-out' requirement and to consumable-depletion for food/meds; solid REST API. — *ga… |
| [Homebox](https://github.com/sysadminsmedia/homebox) | AGPL-3.0-only | ✅ | reference-only | 18 | Lightweight generic home inventory: items with locations, categories, tags, photos, and document/warranty tracking — could catalog personal items (bed/toys/leash) and hold drop-off photos. — *gaps:* Weakest supply-depletion logic of the … |

**Verified verdict.** Affirm build-custom. The value of this component is entirely in the foreign keys (dog+reservation, the timed med/feeding task that decrements count-remaining, and the check-out return checklist) and the shared Postgres write path, none of which any standalone inventory app provides. Mining Grocy's stock schema and Snipe-IT's checkout/return acceptance UX as design references is the right, honest use of these OSS projects. A few Postgres tables beat standing up a second app/DB/auth/sync layer on one small VPS for a solo maintainer. No viable OSS option was missed.


### 24. `onboarding-invites` — Low-friction onboarding & invite flow (customers + staff)

**Requirement.** Allow management/staff to pre-create a customer and their dog profiles and send a magic-link (email/SMS nudge) invite that lets an iOS customer claim the account and install the PWA with no password and minimal steps; provide a separate staff-invite path that assigns role and links to the workforce module.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Better Auth](https://github.com/better-auth/better-auth) | MIT | ✅ | library | 88 | Runs inside our own Node/Postgres app (no separate service, no copyleft reach — MIT). Magic-link plugin issues signed passwordless tokens with a customizable send hook (we wire it to our email/SMS nudge) and supports newUserCallbackURL f… |
| [SuperTokens (self-hosted core)](https://github.com/supertokens/supertokens-core) | Apache-2.0 | ✅ | separate-service | 55 | First-class passwordless email magic-link and OTP recipe, fully self-hostable on-prem with our own DB (no mandatory paid cloud). Run as a separate service, so even the ee/ directory (which is separately licensed/proprietary) doesn't prop… |
| [Ory Kratos](https://github.com/ory/kratos) | Apache-2.0 | ✅ | separate-service | 42 | Fully OSS Apache-2.0 with no license reach when run as a separate service. Has admin APIs for identity lifecycle (pre-create identities) and account recovery/verification link flows that can be repurposed as one-time invite links, plus c… |
| [Lucia (auth guide / reference)](https://github.com/lucia-auth/lucia) | MIT | ✅ | reference-only | 30 | Excellent, current, MIT-licensed reference for implementing signed-token sessions and passwordless flows from scratch in TypeScript — directly useful if we hand-roll the magic-link issuance instead of adopting a library. Zero runtime dep… |

**Verified verdict.** Adopt Better Auth as an in-process library (hybrid) — recommendation stands as written. MIT, actively maintained (v1.6.23, 2026-06-29), fully self-hostable with no cloud dependency and no extra VPS service, and its magic-link (custom send hook), admin.createUser+roles, and organization createInvitation/addMember plugins cover exactly the load-bearing onboarding/invite requirements while leaving the intentionally-bespoke PWA claim/install and dog-profile/workforce linkage to custom code. Ship with magic-link token hashing enabled. SuperTokens/Kratos remain valid only if auth is later split into its own service.


### 25. `waitlist` — Waitlist & booking-request approval queue

**Requirement.** When a requested date range exceeds capacity, capture the customer on a per-range waitlist and, when a cancellation frees a slot, notify waitlisted customers (fairly, first-come) with a time-boxed claim link; also support a pending-request → management-approval step for new/unvetted customers before a booking is confirmed.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Custom build (waitlist + approval as tables/logic in our own app)](https://n/a-custom) | MIT | ✅ | library | 92 | Everything: date-range waitlist keyed to capacity overlap, FCFS ordering by created_at, cancellation-event-driven recompute, single-use time-boxed claim link (hold row with expires_at swept by scheduler, rolls to next), and a separate pe… |
| [Cal.com](https://github.com/calcom/cal.com) | AGPL-3.0-only | ✅ | reference-only | 22 | Has a 'requires confirmation' (host approval) flow and booking limits that loosely mirror the pending-approval requirement; good reference for approval UX. — *gaps:* Appointment-SLOT model, not date-range boarding with capacity; no fair … |
| [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | GPL-3.0-only | ✅ | reference-only | 15 | Solid self-hosted appointment/customer management with a booking form; confirms the general 'self-hosted booking' pattern works. — *gaps:* No date-range/capacity reservations, no waitlist, no auto-notify-on-cancellation, no time-boxed cl… |
| [Line Me Up](https://github.com/calvincchan/line-me-up) | proprietary | ❌ | reference-only | 10 | Implements a live queue with 'notify when it's your turn' notifications - conceptually adjacent to waitlist notification. — *gaps:* No LICENSE file in repo, so no rights are granted - effectively all-rights-reserved / NOT open source des… |

**Verified verdict.** Build-custom is CONFIRMED. No viable OSS option was missed: the only domain-specific pet boarding app (petboarding) is Elastic License 2.0 (source-available, not OSS) and lacks the waitlist/rollover mechanic; all appointment-slot schedulers (Cal.com AGPL app code, Easy!Appointments GPL-3.0, LibreBooking) model slots/resources, not date-range capacity, and none implement fair time-boxed claim-and-rollover or the unvetted-customer approval gate. Implement waitlist_entries + booking_requests + a claim-hold (expires_at) swept by the scheduler, under our own MIT/OSS license. Keep Cal.com/Easy!Appointments as reference-only, and add petboarding to references while explicitly flagging it NOT open source (ELv2).

> ⚠️ **License correction:** Top pick is a custom build under our own MIT/OSS license — confirmed. Reference-candidate correction: Cal.com's ROOT LICENSE file is literally MIT (not "AGPL-3.0-only"); the application code is AGPL-3.0 and /packages/features/ee is a separate commercial/source-available license. Research's AGPL characterization is directionally right for the app code but imprecise about the root file.

> 🔎 **Missed option:** simsustech/petboarding — a domain-specific pet boarding app (Vue/TS + PostgreSQL, actively maintained, v0.7.1 June 2026) with a booking approve/reject workflow. BUT it is Elastic License 2.0 (source-available, NOT OSS) and has no waitlist/fair-rollover mechanic, so it is NOT a viable OSS substitute for this component. Research should have surfaced and flagged it; it does not change the recommendation.


### 26. `backups-dr` — Backups & disaster recovery

**Requirement.** Automated, tested, offsite backups of Postgres AND the object/media store on the single VPS, with point-in-time or at-least-daily recovery, encryption at rest, retention policy, and a written+rehearsed restore runbook — the whole business (bookings, messages, waivers, photos) lives on one box.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [restic](https://github.com/restic/restic) | BSD-2-Clause | ✅ | separate-service | 92 | Media/object store + all config/waiver/file backups; AES-256 encryption at rest; native S3-compatible offsite target; dedup+compression; forget/prune retention; restore + check for rehearsal. Permissive license, zero reach into our app. … |
| [WAL-G](https://github.com/wal-g/wal-g) | Apache-2.0 | ✅ | separate-service | 85 | True Postgres PITR (base + continuous WAL) straight to encrypted S3-compatible offsite storage with retention. Lightweight single-binary sidecar — best fit for one Postgres on a small VPS. Permissive, contained. — *gaps:* Postgres-only (… |
| [pgBackRest](https://github.com/pgbackrest/pgbackrest) | MIT | ✅ | separate-service | 78 | Most feature-complete Postgres PITR: block-incremental backups, parallel transfer, clean `restore --type=time` for rehearsals, encryption at rest, retention, S3 offsite. Permissive MIT, fully contained as a separate service. — *gaps:* He… |
| [Backrest](https://github.com/garethgeorge/backrest) | GPL-3.0-only | ✅ | separate-service | 80 | The operational glue that de-risks a solo maintainer: web UI + cron orchestration for restic (backup, prune, forget, check), snapshot browsing, one-click/point-and-click restore for runbook rehearsal, and failure notifications — very lit… |

**Verified verdict.** Endorse as-is. restic is the correct top pick for the file/media/config half of the component: license (BSD-2-Clause) verified against primary sources, actively maintained (v0.19.0 2026-06-09, pushed 2026-07-01), and genuinely self-hostable with no mandatory paid cloud. The hybrid framing is sound and adversarially honest — restic for files driven by Backrest (GPL-3.0, safely contained as a separate orchestrator container), plus wal-g (Apache-2.0) as the Postgres PITR sidecar with pgBackRest (MIT) as a heavier fallback whose recent archive/revival adds mild continuity risk. Spend the effort on the two things no OSS solves: a coordinated pg+media consistency check and a calendared, actually-rehearsed restore runbook.

> ⚠️ **License correction:** confirmed — BSD-2-Clause verified against the repo LICENSE file (copyright Alexander Neumann) and GitHub API SPDX id BSD-2-Clause; OSI-approved, not source-available

> 🔎 **Missed option:** none clearly better; Kopia (Apache-2.0) is a comparable restic alternative research didn't name, but it's a lateral move (buys nothing extra for a single-VPS S3-offsite target), not clearly better


### 27. `observability` — Observability, monitoring, error tracking & uptime

**Requirement.** For a solo part-time maintainer: app + host metrics, log aggregation, exception/error tracking with alerting, and external uptime checks on the PWA and push pipeline, so failures (missed med alerts, payment errors, push outages) are caught proactively.

**Recommendation:** `hybrid`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | MIT | ✅ | separate-service | 90 | External uptime/synthetic HTTP checks on the PWA and public endpoints; TCP/DNS/cert-expiry checks; PUSH monitors are the key feature for the push pipeline and med-alert dispatch — the app pings a Kuma push URL on each successful dispatch… |
| [GlitchTip](https://gitlab.com/glitchtip/glitchtip-backend) | MIT | ✅ | separate-service | 85 | Exception/error tracking with alerting for the PWA frontend and Node backend using the MIT-licensed official @sentry/* SDKs pointed at your DSN (Sentry-API compatible). Catches payment errors, unhandled rejections, server 500s; issue gro… |
| [Netdata Agent](https://github.com/netdata/netdata) | GPL-3.0-or-later | ✅ | separate-service | 82 | Near-zero-config host + app metrics: CPU/RAM/disk/network plus auto-discovered Postgres, Redis, Docker, nginx/caddy collectors at per-second resolution; built-in alarm engine with sane defaults routing to ntfy/email/webhook. Best effort-… |
| [Grafana + Loki + Prometheus (LGTM-lite)](https://github.com/grafana/loki) | AGPL-3.0-only | ✅ | separate-service | 60 | Most powerful/flexible option: Prometheus for metrics + Alertmanager, Loki for centralized multi-source log aggregation and querying, Grafana for custom long-retention business dashboards and unified alerting. Would fully cover the metri… |

**Verified verdict.** Adopt Uptime Kuma as the uptime + push-pipeline heartbeat piece of the hybrid stack — license (MIT), maintenance, self-hostability, and fit all verified against primary sources. Wire a cron to ping a Kuma Push monitor after each successful med-alert/push dispatch so missed pushes trigger alerts. Keep the rest of the hybrid stack as recommended (Netdata for metrics, GlitchTip over the BSL Sentry server for errors, Loki deferred). No changes required.

> 🔎 **Missed option:** Healthchecks (BSD-3-Clause) is a more purpose-built cron/heartbeat dead-man's-switch for the push-pipeline monitor, but Uptime Kuma's native Push monitor already covers that use case AND adds external HTTP checks in one container, so it is not a clearly-better overall pick.


### 28. `privacy-dsr` — Privacy, data export/deletion (DSR) & legal pages

**Requirement.** Provide customer-facing account self-service for data export and account/pet deletion (with retention carve-outs for financial/incident records), consent capture for photo use and messaging, and hosted privacy-policy / terms / help-support pages — needed because we hold minors-adjacent PII-lite, payment data, and full-res photos of customers' property.

**Recommendation:** `build-custom`

| Project | License (SPDX) | OSS | Mode | Fit | Notes |
|---|---|:---:|---|:---:|---|
| Custom DSR endpoints + soft-delete/legal-hold (build-in-house) | N/A | ✅ | reference-only | 85 | Everything that is actually specific to this business: an authenticated 'export my data' endpoint that dumps a customer's rows (owner, pets, bookings, invoices, messages) + a media manifest of their photos; account/pet deletion as soft-d… |
| [Fides (Ethyca)](https://github.com/ethyca/fides) | Apache-2.0 | ✅ | separate-service | 25 | Conceptually the whole component: a hosted Privacy Center for self-service access/erasure/rectification requests, DSAR orchestration across datastores, consent management, and request tracking. Apache-2.0 as a separate service means zero… |
| [vanilla-cookieconsent (orestbida)](https://github.com/orestbida/cookieconsent) | MIT | ✅ | embed-widget | 35 | The cookie/tracking-consent banner sliver only: category toggles, consent settings modal, records the cookie-consent choice client-side. MIT + client-side means no license reach and no server to run. — *gaps:* Covers only cookie consent,… |
| [Klaro! (KIProtect)](https://github.com/kiprotect/klaro) | BSD-3-Clause | ✅ | embed-widget | 30 | Same niche as vanilla-cookieconsent — a BSD-3 consent/cookie banner with per-service toggles, embeddable client-side with no backend and no license reach. — *gaps:* Cookie/service-consent only; no account-level photo/messaging consent, n… |

**Verified verdict.** Confirmed: build-custom. Build the DSR export, soft-delete-with-legal-hold, and versioned consent-capture directly against our Postgres schema, wiring every deletion and consent event into the audit log; keep privacy/terms/help as static PWA routes (content, not code). Do NOT stand up Fides — it adds a second Python app plus its own Postgres+Redis to the VPS and still cannot write our table-specific queries. Reach for vanilla-cookieconsent (MIT, preferred over Klaro for activity) only if/when a cookie banner is actually needed for third-party trackers; for a first-party PWA with minimal trackers it may be unnecessary. No viable OSS option was missed.

> ⚠️ **License correction:** confirmed — all claimed licenses accurate against actual repos: Fides (ethyca/fides) is Apache-2.0; vanilla-cookieconsent (orestbida/cookieconsent) is MIT; Klaro! (kiprotect/klaro) is BSD-3-Clause. The top pick is in-house code (license = our app's OSS license, N/A as an external dependency). No source-available/BSL relicensing found in any candidate.


---

*Two components — `billing` and `pwa` — had their research agents fail the structured-output retry cap; their recommendations were filled in by hand in §2 above, consistent with the rest of the study.*
