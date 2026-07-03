# Data Model (draft)

> **v1 sketch, not final schema.** A starting relational model for the Node/TS + PostgreSQL + Drizzle
> monolith. Field lists are indicative; refine during the build. Everything lives in **one Postgres** so
> bookings, threads, tasks, and audit foreign-key together — that shared graph is what makes management
> oversight and per-dog alert routing simple SQL rather than cross-service sync.

## Principles

- **One database, foreign keys everywhere.** No per-service DBs. Better Auth and pg-boss create their own
  tables/schemas in the same Postgres.
- **Time:** scheduling data (care tasks, drop-off/pick-up, shifts) stores **local wall-clock time + IANA
  zone** (e.g. `America/Denver`), and the app computes the next **UTC** fire time on write. Never store a
  bare UTC for a recurring wall-clock event. Instants that already happened (audit `occurred_at`,
  message `sent_at`) are `timestamptz`.
- **No recurrence in the booking model.** Boarding is date ranges. Care tasks recur *within a stay* only.
- **Append-only where it matters.** Audit, incidents, and med-completion logs are insert-only; edits are
  new rows that reference the prior one.
- **Money is integer minor units** (cents), never floats. All money math lives in the rate engine.
- **Soft-delete + legal hold** on customer-facing PII (for DSR / disputes), not hard deletes.

## Entity map

```
Organization (the business; single-tenant v1, but keyed for future)
 ├─ User ──< Role (customer | staff | manager)         [Better Auth owns auth columns]
 ├─ Customer ──< Pet ──< CareProfileItem (feeding/med schedule templates)
 │                 ├─< VaccinationRecord (doc + expiry)
 │                 └─< PetSafetyFlag ──< DoNotPair (pet↔pet edges)
 ├─ Reservation (date range, capacity-checked) ──< ReservationDog (pet↔reservation)
 │     ├─ status: requested→approved→checked_in→in_stay→checked_out→complete (+ declined/cancelled)
 │     ├─< CareTask (materialized per-dog timed to-dos for this stay)
 │     │      └─< CareTaskEvent (append-only completion log: given/refused/skipped + who/when + photo)
 │     ├─< Belonging / SuppliedItem (owner-supplied food/med/blanket; return checklist)
 │     ├─ Invoice ──< InvoiceLineItem (boarding nights + add-ons)   Deposit/Balance
 │     └─< IncidentReport (append-only)
 ├─ WaitlistEntry (range-overlap FCFS queue + time-boxed claim hold)
 ├─ Thread (one per customer, scoped to active stay) ──< Message ──< Attachment
 │     └─ ThreadParticipation / TakeoverEvent (oversight + take-over trail)
 ├─ Shift (open→claimed→approved; date-range window) ──< ShiftClaim (first-come) ──< ShiftSwap
 │     └─ view: on_shift_now  (drives care-task routing)
 ├─ AddonCatalogItem (bath, extra walk, nail trim…) → InvoiceLineItem
 ├─ Payment / PaymentEvent (PSP-neutral; Stripe ids + idempotency)
 ├─ WaiverTemplate ──< WaiverSubmission (DocuSeal submission id + signed PDF + cert)
 ├─ AuditEntry (append-only: actor, role, action, subject, before/after jsonb, tz)
 └─ NotificationPreference / PushSubscription (per user, per channel)
```

## Core tables (indicative fields)

### Identity & CRM
- **users** — Better Auth columns + `role`, `phone`, `display_name`, `created_at`. Domain RBAC (takeover,
  approvals) is enforced in app code over the three base roles, not extra role rows.
- **customers** — `user_id`, contact info, `notes`, `soft_deleted_at`, `legal_hold`.
- **pets** — `customer_id`, `name`, `breed`, `weight_g`, `sex`, `vet_contact`, `photo_object_key`,
  behavior notes.
- **care_profile_items** — `pet_id`, `kind` (feeding|medication|task), `label`, `dose`, `local_time`,
  `days` (which days), free-text instructions. These are **templates** copied into `care_tasks` when a
  reservation is approved.
- **vaccination_records** — `pet_id`, `type` (rabies|dhpp|bordetella|…), `expires_on`, `doc_object_key`,
  `status` (valid|expiring|expired) — drives booking gate + expiry-reminder cron.
- **pet_safety_flags** — `pet_id`, `flag` (aggression|separate_at_feeding|escape_risk|allergy|…), detail.
- **do_not_pair** — undirected edge `pet_a_id`/`pet_b_id`; evaluated by `evaluateCoBoardingConflicts()`
  in the booking-capacity and check-in/assignment paths.

### Booking & operations
- **reservations** — `customer_id`, `service_type` (boarding|daycare|grooming), `start_date`, `end_date`
  (date range; `[start, end)`), `status`, `dropoff_at`/`pickup_at` (local time + zone), `deposit_cents`,
  `notes`. Live occupancy is **derived** (a query over overlapping in-stay reservations), never a cached
  counter.
- **reservation_dogs** — `reservation_id`, `pet_id` (a stay can have multiple dogs).
- **care_tasks** — `reservation_id`, `pet_id`, `kind`, `label`, `dose`, `scheduled_local_time`,
  `scheduled_tz`, `next_fire_utc`, `assigned_to` (resolved at fire time from `on_shift_now`),
  `state` (pending|done|overdue|missed).
- **care_task_events** — append-only: `care_task_id`, `actor_user_id`, `occurred_at`, `outcome`
  (given|refused|skipped), `note`, `photo_object_key`. Editing a logged time inserts a new row citing the
  prior — the original is preserved.
- **belongings** — `reservation_id`, `pet_id`, `label`, `qty`, `returned` (check-out checklist).
- **waitlist_entries** — `customer_id`, requested range, `created_at` (FCFS), `claim_hold_expires_at`
  (single-use link swept by pg-boss), `status`.

### Messaging & oversight
- **threads** — `customer_id`, `reservation_id?`, `assigned_staff_id`, `flags` (flagged|unanswered|med|bill),
  `last_message_at`, `sla_due_at`.
- **messages** — `thread_id`, `sender_user_id`, `sender_identity` (always the *business/team* to the
  customer), `body`, `sent_at`, `read_at`, delivery state.
- **attachments** — `message_id`, `object_key`, `variant` (orig|thumb), `content_type`.
- **takeover_events** — append-only: `thread_id`, `manager_user_id`, `action` (view|join|takeover|handback),
  `occurred_at`. "View" is silent + logged; join/takeover are visible to the customer as the team identity.

### Workforce
- **shifts** — `window_start`/`window_end` (local + zone), `role_needed`, `status` (open|claimed|approved|filled),
  workload preview counts.
- **shift_claims** — `shift_id`, `staff_id`, `claimed_at`; **first-come enforced by a unique partial
  constraint / optimistic lock**; `state` (pending|approved|denied|withdrawn).
- **shift_swaps** — `from_shift_id`, `to_staff_id`, approval state.
- **on_shift_now** — a **view/materialized view** over approved shifts intersected with `now()`; the
  single source of truth for routing a firing care task to the right staffer.

### Money
- **invoices** — `reservation_id`, `subtotal_cents`, `tax_cents`, `deposit_cents`, `balance_cents`,
  `status` (draft|open|paid|void).
- **invoice_line_items** — `invoice_id`, `kind` (boarding|addon|discount|tax), `label`, `qty`,
  `unit_cents`, `addon_catalog_item_id?`.
- **addon_catalog_items** — `label`, `price_cents`, `active`. A purchased add-on both adds a line item and
  can spawn a `care_task` (e.g. "extra walk").
- **payments / payment_events** — PSP-neutral: `provider` (stripe), `provider_ref`, `amount_cents`,
  `kind` (deposit|balance|refund), plus a **de-duped webhook log** keyed on the Stripe event id with
  out-of-order guarding.
- **rate rules** — pricing/refund is a deterministic ~200–400-line TS calculator (per-night base,
  multi-dog discount, size/holiday surcharge, deposit %, tiered cancellation refund). Owner-editable rule
  *tables* are a later option (optionally evaluated with `json-rules-engine`); money arithmetic stays in
  our code.

### Compliance & platform
- **waiver_templates / waiver_submissions** — DocuSeal `template_id` / `submission_id`, `signed_pdf_key`,
  `certificate`, `template_version`; a "signed current version?" check gates the first stay.
- **incident_reports** — append-only: `reservation_id?`, dogs involved, `type`, `severity`, `occurred_at`,
  description, photos, `action_taken`, `owner_notified`.
- **audit_entries** — append-only: `occurred_at` (timestamptz + `tz`), `actor_user_id`, `actor_role`,
  `action` (enum), `subject_type`/`subject_id`, `before`/`after` (jsonb), `correlation_id`. Optionally
  backstopped by vendored `supa_audit` triggers on money/booking tables. **Not** marketed as cryptographic
  immutability (the maintainer is DB superuser).
- **push_subscriptions / notification_preferences** — per user, per channel (web-push, SMS nudge, email);
  orchestration + digests + escalation run as custom pg-boss jobs.
- **documents** — `pet_id`/`customer_id`, `object_key`, `kind`, `expires_on?` — vaccination + vet docs on
  the shared S3 store; daily expiry-scan cron.

## Invariants worth writing tests for first

1. **No overbooking.** Approving a reservation checks per-night capacity via a range-overlap query
   (`daterange && daterange`, exclusion constraint candidate); an over-capacity approval requires an
   explicit override that is audit-logged.
2. **First-come, exactly-once shift claim.** Concurrent claims on the same shift resolve to one winner via
   a unique constraint / `SELECT … FOR UPDATE`; losers get "just taken".
3. **A firing care task routes to whoever is actually on shift** at fire time (`on_shift_now`), not who
   was on shift when the task was created; missed doses escalate pending→overdue→management.
4. **DST/travel correctness.** A task set for "8:00 AM `America/Denver`" fires at the right instant across
   a DST boundary and regardless of server timezone.
5. **Oversight without session breakage.** A manager "view" is invisible and logged; "take over" reroutes
   the customer to the management identity under the same team persona without dropping the customer's
   thread/session.
6. **Idempotent payments.** A Stripe webhook delivered twice (or out of order) never double-credits;
   reconciliation sweep catches silently-dropped retries.

---

*Model derived from the 2026-07-03 component study. It is intentionally a few dozen tables — the smallest
graph that expresses date-range boarding, oversight messaging, shift claiming, and timed alerts in one
Postgres.*
