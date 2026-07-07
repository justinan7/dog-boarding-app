# Zoomez API contract — v1

**This file is the source of truth for the HTTP API.** Three clients build against it — the PWA
(`web/`), the iOS app, and the Android app — plus the server that implements it. Nobody invents
endpoints: change the contract here first (one PR touching this file + the server), then clients
follow. Endpoints are tagged by build phase (**[P1]** replace group texts · **[P2]** money ·
**[P3]** workforce) matching [`build-plan.md`](build-plan.md).

Status: **draft, pre-implementation** — shapes may be refined *by the server implementer* only where
this file is silent; anything specified here is binding until amended.

---

## 1. Conventions

- Base path **`/api/v1`**. JSON bodies, `camelCase` keys. UTF-8.
- **IDs**: UUID strings (server-generated, UUIDv7 preferred).
- **Instants** (things that happened): ISO-8601 UTC, e.g. `"2026-07-07T21:04:00Z"`.
- **Wall-clock schedule times** (things that recur/fire locally): `{ "localTime": "08:00", "timeZone": "America/Los_Angeles" }` — never bare UTC (see `data-model.md` invariant 4).
- **Dates** (stay ranges): `"2026-07-04"`; ranges are half-open `[startDate, endDate)` — endDate is checkout day, not a boarded night.
- **Money**: integer cents, `"currency": "usd"` implied. Never floats.
- **Pagination**: `?cursor=<opaque>&limit=<1..100>` → `{ "items": [...], "nextCursor": "..." | null }`. Default limit 25, newest first unless noted.
- **Errors** (non-2xx):
  ```json
  { "error": { "code": "CAPACITY_FULL", "message": "Jul 4 is at capacity.", "details": { "dates": ["2026-07-04"] } } }
  ```
  Codes: `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `ELEVATION_REQUIRED` 403 · `NOT_FOUND` 404 ·
  `VALIDATION` 422 (with `details.fields`) · `CONFLICT` 409 (races: shift already claimed, capacity
  changed, version conflict) · `CAPACITY_FULL` 409 · `IDEMPOTENT_REPLAY` 200 (returns original result) ·
  `RATE_LIMITED` 429.
- **Idempotency**: POSTs that create money or claim state (`/checkout-session`, `/shifts/:id/claim`,
  `/reservations`) accept an `Idempotency-Key` header; server stores key→result for 24 h and replays.
- **Roles**: `customer` | `staff` | `manager`. Endpoints below are tagged (C)/(S)/(M); (M🔒) additionally
  requires manager elevation (§2.3). Staff and managers are the same account type with different roles;
  a manager passes (S) checks too.

## 2. Auth

Better Auth is mounted at **`/api/auth/*`** (its own route conventions — clients use the Better Auth
client SDKs rather than hand-rolling these). What the contract fixes:

### 2.1 Methods
- **Email + password** and **magic link** [P1] — customers and staff.
- **Phone OTP** [P2, optional] — customers.
- Invites: staff/customers are created by management (§5.9) and claim their account via a magic link.

### 2.2 Sessions per client
- **PWA**: cookie sessions (Better Auth default; `HttpOnly`, `SameSite=Lax`, secure).
- **iOS / Android**: **bearer tokens** via the Better Auth `bearer` plugin. Sign-in response exposes the
  session token (`set-auth-token` response header per Better Auth docs); clients store it in
  Keychain/Keystore and send `Authorization: Bearer <token>` on every request, including `/api/v1/*`.
- Both transports hit the same server; no separate "mobile API".

### 2.3 Manager elevation (PIN)
Manager screens (approvals, oversight, overrides) sit behind a short-lived elevation on top of a
staff/manager session — the design's PIN-locked account switch:
- `POST /api/v1/auth/elevate` (S) `{ "pin": "1234" }` → `204`. Grants `managerElevatedUntil = now+15m` on the session. Wrong PIN → `403 FORBIDDEN`; 5 failures/15 min → `429`.
- `POST /api/v1/auth/de-elevate` (S) → `204`.
- `GET /api/v1/me` reports the state. (M🔒) endpoints return `ELEVATION_REQUIRED` when expired; clients re-prompt for the PIN.

### 2.4 `GET /api/v1/me` (any) [P1]
```json
{ "id": "…", "role": "manager", "name": "Corry", "email": "…",
  "customerId": null, "staffId": "…",
  "managerElevatedUntil": "2026-07-07T21:19:00Z" | null }
```

## 3. Core entities (response shapes)

Field lists are the contract's minimum; server may add fields, never repurpose them. FKs expand with
`?include=` only where noted.

```ts
Pet        { id, customerId, name, breed, weightLb, sex, birthYear?, vetContact?,
             photoUrl?, behaviorNotes?, safetyFlags: string[],           // "separate_at_feeding", "allergy:chicken", …
             careProfile: CareProfileItem[], vaccinations: Vaccination[], waiverStatus: "signed"|"missing"|"outdated" }
CareProfileItem { id, kind: "feeding"|"medication"|"task", label, dose?, localTime, timeZone, notes? }
Vaccination{ id, type, expiresOn, status: "valid"|"expiring"|"expired", documentUrl? }
Reservation{ id, customerId, petIds: string[], serviceType: "boarding"|"daycare",
             startDate, endDate, status: "requested"|"approved"|"denied"|"waitlisted"|"cancelled"
                    |"checked_in"|"checked_out",
             dropoff?: {localTime,timeZone}, pickup?: {localTime,timeZone},
             notes?, depositCents, quote?: Quote, createdAt }
Quote      { lineItems: [{kind,label,qty,unitCents,totalCents}], subtotalCents, depositCents, totalCents }
Thread     { id, customerId, reservationId?, assignedStaffId?, lastMessageAt, unreadCount,
             flags: string[], oversight?: { state: "viewing"|"joined"|"taken_over", byUserId } } // manager-only field
Message    { id, threadId, senderId, senderRole, senderDisplay,   // customers always see the business identity
             body?, attachments: [{kind:"photo"|"document", url, thumbUrl?, width?, height?}],
             sentAt, readAt? }
CareTask   { id, reservationId, petId, petName, kind, label, dose?,
             scheduled: {localTime,timeZone}, dueAtUtc, assignedStaffId?,
             state: "scheduled"|"due"|"overdue"|"done"|"refused"|"skipped",
             completion?: { byUserId, byDisplay, at, outcome, note?, photoUrl?, managerOverride: boolean },
             addedBy?: { userId, display, at } }                  // ad-hoc tasks
Shift      { id, windowStart: {localTime,timeZone,date}, windowEnd: {…}, status: "open"|"pending"|"filled",
             dogCount, medRoundCount, claim?: { staffId, staffDisplay, claimedAt, state: "pending"|"approved"|"denied" } }
ReportCard { id, reservationId, petId, date, status: "draft"|"sent", mood?, appetite?, photos: [...],
             bestMoment?, careLogSummary?, sentAt?, heartedAt? }
Invoice    { id, reservationId, status: "draft"|"open"|"paid"|"void",
             lineItems: [...], subtotalCents, depositPaidCents, balanceCents }
Incident   { id, type: "bite"|"injury"|"escape"|"illness"|"other", severity: "minor"|"moderate"|"severe",
             petIds, occurredAt, description, photos, actionsTaken: string[], ownerNotified, reportedBy, createdAt }
AuditEntry { id, occurredAt, actorDisplay, actorRole, action, subjectType, subjectId, summary }
```

## 4. Realtime (Centrifugo)

- `POST /api/v1/realtime/token` (any) [P1] → `{ "token": "<jwt>", "wsUrl": "wss://…/connection/websocket" }`.
  JWT carries the channels this user may subscribe to. Clients reconnect with a fresh token on expiry.
- **Channels** (server publishes; clients subscribe only):
  - `user:{userId}` — anything for this person: booking status changed, new message notification, task assigned, report card delivered.
  - `thread:{threadId}` — `message.new`, `message.read`, `typing` (participants + oversight managers).
  - `ops:tasks` (S) — task board deltas: `task.due`, `task.overdue`, `task.completed`.
  - `ops:shifts` (S) — `shift.posted`, `shift.claimed`, `claim.approved|denied`.
  - `mgmt:oversight` (M) — fan-out of every thread event + `sla.breach`, for the inbox periscope.
- Payloads: `{ "type": "message.new", "data": { …entity or delta… } }`. Realtime is advisory —
  clients must reconcile via REST on reconnect; nothing is delivered *only* over Centrifugo.
- Typing: `POST /api/v1/threads/:id/typing` (participant) → `204`, throttled server-side (~3 s).

## 5. Endpoints

### 5.1 Uploads (photos & documents) [P1]
1. `POST /api/v1/uploads` (any) `{ "kind": "photo"|"document", "contentType": "image/heic", "bytes": 4200000 }`
   → `{ "objectKey": "u/2026/07/….heic", "uploadUrl": "<presigned PUT>", "expiresAt": … }` (max 25 MB photo / 15 MB doc).
2. Client `PUT`s the raw file to `uploadUrl` (straight to object storage, bypassing the API).
3. Client references `objectKey` in the consuming call (message attachment, vax record, task photo…).
   The server validates the key, enqueues HEIC→JPEG + thumbnail processing, and from then on returns
   ready-to-render short-lived `url`/`thumbUrl` values. Clients never construct storage URLs.

### 5.2 Customers & pets
- `GET /api/v1/customers` (S) [P1] — `?q=` search; paginated.
- `POST /api/v1/customers` (M) [P1] — create + optionally send invite.
- `GET /api/v1/customers/:id` (S, or own) [P1].
- `PATCH /api/v1/customers/:id` (M, or own contact fields) [P1].
- `GET /api/v1/pets?customerId=` (S, or own) · `POST /api/v1/pets` (own, S) · `PATCH /api/v1/pets/:id` [P1].
- Care profile: `PUT /api/v1/pets/:id/care-profile` (own, S) [P1] — full-list replace of `CareProfileItem[]`.
- Vaccinations: `POST /api/v1/pets/:id/vaccinations` `{type, expiresOn, objectKey}` (own, S) [P1];
  `DELETE /api/v1/vaccinations/:id` (S).
- Safety flags & do-not-pair (S) [P1]: `PUT /api/v1/pets/:id/safety-flags` `{flags: string[]}`;
  `POST /api/v1/pets/:id/do-not-pair` `{otherPetId}`; `DELETE …/do-not-pair/:otherPetId`.

### 5.3 Capacity & reservations
- `GET /api/v1/capacity?from=2026-07-01&to=2026-07-31` (any authed) [P1]
  → `{ "capacity": 8, "nights": [{ "date": "2026-07-04", "booked": 8, "full": true }, …] }`.
- `POST /api/v1/reservations` (C) [P1] — `{ petIds, serviceType, startDate, endDate, dropoff, pickup, addOnIds?, notes? }`
  → `201 Reservation` (`status: "requested"`) with `quote`. Full nights don't block a *request*; the
  response echoes `warnings: ["CAPACITY_FULL: 2026-07-04"]`. Unsigned waiver/vax adds warnings too.
- `GET /api/v1/reservations` — (C) own; (S) `?status=&from=&to=&petId=` all. [P1]
- `GET /api/v1/reservations/:id` (owner or S) [P1] — `?include=quote,invoice,careTasks`.
- `POST /api/v1/reservations/:id/cancel` (owner) [P1] — pre-approval: withdrawn; post-approval [P2]:
  applies the cancellation policy, returns the computed refund breakdown.
- Manager decisions (M🔒) [P1]:
  - `POST …/:id/approve` — body `{ "overrideCapacity": true }` required iff any night is FULL, else `409 CAPACITY_FULL`. Approval **materializes CareTasks** from each pet's care profile and blocks on `waiverStatus != "signed"` with `409 CONFLICT` (`details.reason: "waiver"`) unless `{ "overrideWaiver": true }`.
  - `POST …/:id/deny` `{ "reason"? }` · `POST …/:id/waitlist`.
- Staff lifecycle (S) [P1]: `POST …/:id/check-in` `{ arrivedAt?, intakePhotoKeys?, belongings?: [{label,qty}] }`
  · `POST …/:id/check-out` `{ belongingsReturned: boolean }` — guarded transitions per `data-model.md`.
- Waitlist: `GET /api/v1/waitlist` (S) [P1]; offers go out via notification with a claim link
  `POST /api/v1/waitlist/:entryId/claim` (C, single-use, expiring) [P2].

### 5.4 Threads & messages [P1]
- `GET /api/v1/threads` — (C) own (usually 1); (S) assigned + unassigned; `?filter=flagged|unanswered|med|billing`.
- `GET /api/v1/threads/:id/messages` (participant, or M) — paginated, oldest-cursor.
- `POST /api/v1/threads/:id/messages` (participant, or M after join/takeover)
  `{ body?, attachmentKeys?: string[] }` → `201 Message`. Customers see `senderDisplay` = business identity always.
- `POST /api/v1/threads/:id/read` `{ lastMessageId }` → `204` (drives receipts).
- **Oversight** (M🔒):
  - `GET /api/v1/oversight/threads` — every thread + SLA timers, sorted flagged/unanswered first.
  - Opening `GET /threads/:id/messages` as a non-participant manager **is** the silent view — server audit-logs `oversight.viewed` automatically (the design's "logged 2:14 PM").
  - `POST /api/v1/threads/:id/oversight` `{ "action": "join" | "take_over" | "hand_back" }` → `200 Thread`.
    `take_over` mutes the assigned staffer (server rejects their posts with `403` + notifies them), routes replies as management under the same business identity. Every transition is audit-logged.

### 5.5 Care tasks & task board
- `GET /api/v1/care-tasks?date=2026-07-07&petId=&state=` (S) [P1] — the day's rail; (M) sees all + override fields.
- `POST /api/v1/care-tasks` (S) [P3] — ad-hoc add: `{ petId, reservationId, kind, label, dose?, scheduled:{localTime,timeZone}, repeats: "once"|"daily_this_stay", alertOnShift: boolean }`; records `addedBy`.
- `POST /api/v1/care-tasks/:id/complete` (assigned staff; M🔒 with `managerOverride:true`) [P1]
  `{ outcome: "given"|"refused"|"skipped", note?, photoKey?, at? }` → `200 CareTask`. `refused|skipped`
  require `note`. Manager override is flagged + audit-logged (the design's `Mark done*`).
- `POST /api/v1/care-tasks/:id/snooze` (assigned staff) [P3] `{ minutes: 10|20|30 }`.
- Routing rule (server-side): at fire time a task pushes to whoever is **on shift then** (`on_shift_now`),
  escalating unacknowledged → overdue → `mgmt` per `data-model.md` invariant 3.

### 5.6 Shifts (workforce) [P3]
- `GET /api/v1/shifts?status=open&from=&to=` (S) — open board; `GET /api/v1/shifts/mine` (S).
- `POST /api/v1/shifts` (M🔒) — post an open shift `{ windowStart, windowEnd, notes? }`.
- `POST /api/v1/shifts/:id/claim` (S) — **first-come**: winner gets `200 {claim: pending}`; a losing
  concurrent claim gets `409 CONFLICT` (“just taken”). Overlap with the claimer's schedule → `409` with `details.overlap`.
- `DELETE /api/v1/shifts/:id/claim` (S, own, while pending) — withdraw.
- `POST /api/v1/shifts/:id/claim/approve` · `…/deny` (M🔒) — approval assigns + notifies; denial reopens.

### 5.7 Report cards
- `GET /api/v1/report-cards?petId=&reservationId=` (owner sees `sent`; S sees drafts too) [P1].
- `POST /api/v1/report-cards` (S) [P1] `{ reservationId, petId, date, photosKeys, mood?, appetite?, bestMoment?, includeCareLog: boolean }` → draft.
- `PATCH /api/v1/report-cards/:id` (S, draft only) · `POST …/:id/send` (S) — posts into the thread + nudges owner.
- `POST /api/v1/report-cards/:id/heart` (C) — the postcard's reaction.

### 5.8 Money [P2]
- `GET /api/v1/addons` (any) — upsell catalog `[{id,label,priceCents,per:"stay"|"day"}]`.
- `POST /api/v1/reservations/:id/addons` (C, S) `{ addonId }` — appends line item, recalcs invoice, spawns a staff task where applicable.
- `GET /api/v1/invoices?reservationId=` (owner, S) · `GET /api/v1/invoices/:id`.
- `POST /api/v1/invoices/:id/checkout-session` (owner) `{ "portion": "deposit"|"balance" }`
  → `{ "checkoutUrl": "<Stripe-hosted URL>" }`. Payment state lands via webhook; clients poll the invoice or listen on `user:{id}`.
- `POST /api/v1/invoices/:id/remind` (M🔒) — the "Chase" button: payment-reminder nudge into the thread.
- Webhook (server↔Stripe only): `POST /webhooks/stripe` — signature-verified, idempotent on event id, out-of-order-safe.

### 5.9 Waivers (DocuSeal) [P2]
- `GET /api/v1/waivers/status?customerId=` (own, S) → per-pet/per-customer `signed|missing|outdated` + current template version.
- `POST /api/v1/waivers/signing-link` (own; or M🔒 to send) → `{ "url": "<DocuSeal hosted signing page>" }` (deep-link/nudge; embedded signing is out — Pro-only).
- Webhook: `POST /webhooks/docuseal` — stores signed PDF + audit certificate, flips status.

### 5.10 Incidents [P2]
- `POST /api/v1/incidents` (S) — full `Incident` body; `{ notifyOwnerNow: boolean }` drafts an owner
  message for review. Severity `severe` pushes management immediately. Append-only.
- `GET /api/v1/incidents?petId=` (S; owner sees only owner-shared summaries).

### 5.11 Reports & audit (M🔒) [P2]
- `GET /api/v1/reports/summary?month=2026-07` → `{ occupancy: {avgPct, nights: […]}, revenue: {boardingCents, upsellsCents, totalCents, outstandingCents, outstandingCount}, staff: [{display, shifts, tasks, onTimePct}] }`.
- `GET /api/v1/audit?actor=&action=&subjectType=&cursor=` — append-only feed, newest first.

### 5.12 Push registration [P1 web · P-native when apps land]
- `POST /api/v1/push/subscriptions` (any)
  `{ "platform": "webpush"|"apns"|"fcm", "token": <sub JSON or device token>, "deviceName"? }` → `201`.
- `DELETE /api/v1/push/subscriptions/:id`. Server routes each notification to all active
  subscriptions per user prefs; `GET/PUT /api/v1/me/notification-preferences` [P2].

## 6. Cross-cutting rules for implementers

1. **Every state transition writes an AuditEntry** in the same DB transaction (approve/deny, check-in/out, oversight view/join/takeover/handback, task complete + overrides, claim approve/deny, payment events, card send). No exceptions.
2. **AuthZ is SQL-shaped**: customers see rows FK'd to their `customerId`; staff see operational rows; (M🔒) guards the manager surface. Never filter client-side.
3. **Race-safe by constraint, not by check-then-act**: shift claim and capacity approval use DB constraints/row locks (`data-model.md` invariants 1–2); on violation return `409`.
4. **Times**: store wall-clock + zone for schedules, compute UTC fire times, recompute on care-profile edit. Test across a DST boundary.
5. **Webhooks are at-least-once**: de-dupe on provider event id; reconciliation sweep for missed events.
6. OpenAPI: the server generates/serves `/api/v1/openapi.json` from its route definitions; keep this file and that output aligned — CI should diff route names.
