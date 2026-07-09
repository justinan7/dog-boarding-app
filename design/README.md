# Handoff: Zoomez — Dog Boarding App (Customer, Staff & Management)

## Overview
Zoomez is a luxury dog-boarding business in San Diego. This package covers the full mobile app across **three role views**:
- **Customer** (dog owner) — book stays, view daily report cards, message the team, pay, manage pet profiles.
- **Staff** (caregiver) — run the daily care checklist, claim shifts, build report cards, file incidents.
- **Management** (owners) — approve bookings against capacity, oversee/take over staff message threads, watch the live task board, review reports + an audit log.

One login; Staff and Management are **views** of the same account, switched via an account chip (Management is PIN-locked).

## About the Design Files
The files in this bundle are **design references created in HTML** — streaming "Design Component" prototypes (`.dc.html`) plus self-contained standalone `.html` builds that show the intended look and behavior. **They are not production code to copy directly.** The task is to **recreate these designs in the target codebase's environment** (the repo this is being handed to — React/React Native/etc.) using its established components, patterns, and libraries. If no UI environment exists yet, implement with the framework already chosen for that repo.

The `.dc.html` files use a bespoke streaming runtime (`support.js`) and mount design-system components via `<x-import>`. **Do not port that runtime.** Read the `.dc.html` for exact structure, copy, and values; read the design-system CSS tokens for exact colors/spacing/type; then build in the real stack. Open the `standalone/*.html` files in any browser to see the finished pixels.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and copy are all specified by the Zoomez design system and reproduced here. Recreate the UI pixel-perfectly using the codebase's existing libraries. (An earlier low-fi wireframe file, `Zoomez Wireframes.dc.html`, is included only as historical context for layout intent — not the visual target.)

## Design System — Tokens
All values come from the **Zoomez design system** ("playful luxe": coastal blues/greens, warm foam surfaces, golden-hour accent). Exact token files are under `design-system-tokens/`.

### Color
| Token | Hex | Use |
|---|---|---|
| `--lagoon-900` | `#0C2B2A` | Darkest text / inverse surfaces |
| `--lagoon-700` | `#14403D` | **Primary** — buttons, active nav, headings-on-light |
| `--lagoon-500` | `#1F5C56` | Primary hover; meter fills |
| `--lagoon-300` | `#6FA49B` | Muted icon on tint |
| `--seaglass-200` | `#CFE4DA` | Avatar bg, secondary chips |
| `--seaglass-100` | `#E6F0EA` | Photo/placeholder tint |
| `--foam-50` | `#F7F5EE` | **Page background**, text-on-dark |
| `--white` | `#FFFFFF` | Card surface |
| `--tide-500` | `#3E7CA6` | Focus/info; staff avatar bg accent |
| `--biscuit-500` | `#C99348` | **Gold accent** — highest-end CTAs, eyebrows, the wordmark period |
| `--biscuit-700` | `#A87430` | Gold text on light-gold bg |
| `--biscuit-200` | `#F0E2C6` | Warning/nudge surface (deposit due, pending) |
| `--coral-500` | `#DF7757` | **Rare** playful/alert pop — incident submit, overdue, takeover slider |
| `--coral-200` | `#F6DBD1` | Alert surface tint |
| `--ink-700` | `#2E3B38` | Body text |
| `--stone-600` | `#5C6B67` | Muted text / eyebrow labels |
| `--stone-400` | `#93A19C` | Inactive nav, placeholder, chevrons |
| `--stone-200` | `#D9DFDB` | Borders/tracks |
| `--stone-100` | `#EBEEEA` | Segmented-control track |
| `--green-success` | `#2E7D5B` | Done/approved states |
| `--amber-warning` | `#B97F24` | Warnings |
| `--red-error` | `#B54334` | Errors, expired vax, overdue text |
| `--border-subtle` | `#E4E1D6` | 1px card borders |

Neutrals are **green-cast**, never pure gray. Shadows are **teal-cast**, never gray.

### Typography
- **Display** (`--font-display`): `Instrument Serif`, 400 only, italics for warmth/puns. Used for all display ≥22px (page titles, card titles, prices, the wordmark).
- **Body/UI** (`--font-body`): `Figtree`. Weights 400/500/600/700.
- **Eyebrow labels**: Figtree 600, UPPERCASE, `letter-spacing: 0.14em`, color `--stone-600` (or gold/lagoon). Size 12px.
- Scale: xs 12 · sm 14 · base 16 · lg 18 · xl 22 · 2xl 28 · 3xl 38 · 4xl 52 · 5xl 72 (px).
- Line heights: display 1.05 · tight 1.2 · body 1.55.
- **Sentence case everywhere**, including buttons and headlines. Uppercase only for eyebrow labels.

### Radii
`--radius-sm` 8 · `--radius-md` 14 · `--radius-lg` 20 (cards) · `--radius-xl` 28 (feature panels, imagery) · `--radius-pill` 999 (all buttons & badges). px.

### Shadows (teal-cast)
- `--shadow-card`: `0 1px 2px rgba(12,43,42,.05), 0 8px 24px rgba(12,43,42,.07)`
- `--shadow-float` (hover): `0 4px 12px rgba(12,43,42,.10), 0 20px 48px rgba(12,43,42,.14)`
- `--shadow-inset` (inputs): `inset 0 1px 2px rgba(12,43,42,.06)`

### Motion
Durations 150/250/450ms. Ease-out `cubic-bezier(0.22,1,0.36,1)`. Hover = lift `translateY(-2px)` + float shadow; press = `scale(0.98)`. No bounces, no infinite loops. Focus ring: `0 0 0 3px rgba(62,124,166,.35)`.

### Layout (mobile)
- Designed in an iPhone frame, **~402px logical width** (device frame 402×874). Content padding **20px** horizontal; top padding ~64–68px (clears the notch/status bar); bottom tab bar padding `10px 8px 26px` (last value clears the home indicator).
- Vertical rhythm: **16px** gap between major sections; **8–12px** within a card.
- Bottom tab bar: 5 items, `space-around`, icon 21px + 10.5px label; active = `--lagoon-700` weight 600, inactive = `--stone-400` weight 500.

## Iconography
[Lucide](https://lucide.dev) icons (`lucide-static@0.469.0`), rendered as a CSS-masked `<span>` so they tint with `currentColor`. In the target codebase, use its existing Lucide integration (e.g. `lucide-react`). Icons used across the app:
`arrow-up, bell, bone, calendar-days, camera, check, chevron-down, chevron-left, chevron-right, chevrons-right, clipboard-check, clock, credit-card, dog, download, eye, file-check, heart, house, image, images, inbox, info, layout-dashboard, log-out, lock, menu, message-circle, paw-print, pill, plus, search, send, settings, sun, triangle-alert, user-round, utensils, waves, x`.
Dog **avatars** appear on every pet mention (currently a `dog` glyph on `--seaglass-200`; swap for the owner's uploaded photo when available). The Zoomez mark is **typographic only** — "Zoomez" in Instrument Serif italic + a gold `.`; never a drawn logo.

## Voice & Copy
Concierge-with-a-wagging-tail: luxury-hotel polish, second person for owners, dogs referred to by name. Sentence case. No emoji, no exclamation stacking, no urgency/scarcity. Puns are rare and upscale (max ~one per screen). Exact copy is in each screen file — use it verbatim.

---

## Screens / Views

### CUSTOMER — `Zoomez Customer Hi-Fi.dc.html` (standalone: `standalone/Zoomez Customer App.html`)
Bottom tabs: **Home · Book · Messages · Pets · Account**.

1. **Home** — greeting (Instrument Serif "Good morning, Sarah."), upcoming-stay card with dog avatar + Approved badge + drop-off time, a seaglass "Before check-in" panel listing action items (pay deposit / sign waiver) with inline buttons, latest report-card preview row, and a gold full-width "Book a stay" CTA. Header: wordmark left; bell + account chip ("Sarah ▾") right. The "Before check-in" panel is conditional on an unpaid deposit (`depositPaid` prop toggles it off).
2. **Book a stay** — dog multi-select pills (avatar + name; selected = filled lagoon), a month calendar with the selected range filled lagoon (pill ends rounded) and full days struck through, drop-off/pickup rows, add-on checkboxes with prices, a notes input, live estimate + deposit line, and a primary "Request this stay" button. Copy: "We'll confirm your request within a day."
3. **Report card — postcard** — back header (dog name + "Day 1 of 2"), a **dark lagoon quote card** with a gold eyebrow "From Brette at Zoomez" and an italic handwritten-style note, a 2×2 photo grid (last tile shows a "+2" overlay), "Tap any photo for the full story", trait badges, a care-log trust row ("Care log · 4 of 4 complete"), and Heart/Reply buttons.
4. **Report card — story view** — dark, gradient lagoon full-bleed; instagram-style progress segments at top, dog chip + close, a large centered photo area, trait chips, an italic caption card, heart/save actions. Reached by tapping a photo in screen 3.
5. **Stay detail** — status **timeline** (Requested → Approved [current] → Check-in → In residence → Check-out) with filled/hollow nodes, a cost breakdown card with a conditional gold "deposit due" row, and Message/Cancel buttons.
6. **Messages** — team thread ("Zoomez concierge"); owner's bubbles are lagoon/right, team's are white/left with sender name; includes a photo bubble and a "typing…" line. Composer: + / input / send, all pill/circle. `keyboardOpen` prop raises the iOS keyboard.
7. **Payment** — invoice line items (with a negative "deposit paid" line), an "A little something extra" upsell list (each `+ $x` ghost button; taps should recalc the total live), payment-method radios, gold "Pay $95" CTA. Copy: "A receipt will be emailed to you."
8. **Pet profile** — avatar + breed/weight/age + vet, feeding & medication rows (utensils/pill icons + times), vaccination rows with success/expired badges (Bordetella **Expired** → Update button), upload button, and a signed-waiver trust row.

### STAFF — `Zoomez Staff Hi-Fi.dc.html` (standalone: `standalone/Zoomez Staff App.html`)
Bottom tabs: **Today · Shifts · Dogs · Messages · Me**.

1. **Today** — an "On shift 7a–3p" status pill + account chip ("Jack ▾") + a coral SOS button; a date title; a **"Next up"** dark lagoon hero card (the single most-imminent task, gold "Do it" + snooze); a "Here now · 5 dogs" list (avatar + name + "2 due"/"done ✓"/"Med" badges); a progress meter (9/14).
2. **Shift board** — segmented control (Open shifts / My schedule); open-shift claim cards (day eyebrow, big time, gold "Open" badge, dog/med counts, primary **Claim shift**); a **pending** card (biscuit border, "Pending · you" badge, overlap warning, Withdraw); a compact list of claimed/other days.
3. **Dog checklist** — dog header (avatar, breed, stay dates, owner) + a biscuit **allergy/arthritis warning** banner; "Today" section with a **"+ Add task"** button; timed checklist rows (checked = strikethrough + "done HH:MM by you"; pending = empty checkbox + due countdown + chevron); an ad-hoc row tagged "Added by you"; an evening task greyed as "routes to evening staff".
4. **Add task sheet** (`03b`) — bottom sheet over a scrim: "Repeats" (One time / Daily this stay), Task input, When, Type chips (Med/Feed/Walk/Check), an "Alert on-shift staff at task time" switch, "Add to checklist". Footer: "Logged as 'added by Jack, 11:42 AM' — visible to management."
5. **Report card builder** — a photo grid with a dashed "+" add tile, Mood chips (single-select, "Playful" selected), Appetite chips, a "Best moment" input, an auto-pulled care-log confirmation row, and Save draft / **Send to owner** buttons.
6. **Dog roster** — search + "Urgency" sort button; dog cards sorted by urgency; the top card has a **coral border + "Overdue 3m"**; others show allergies (red), "Separate at feeding" (red), meds, or "Done ✓".
7. **Incident report** — Type chips (Bite selected), Dogs-involved chips, When, Severity chips (Moderate selected), a "What happened" textarea, photo tiles, an action checklist (Separated ✓ / First aid / Vet), a "Notify owner now" switch, and a **coral "Submit — alerts management"** button. Autosaving.
8. **Account · view switcher** — bottom sheet: avatar + name/email; **View as** radio cards — **Staff** (selected) and **Manager** (with a gold **PIN** lock badge); Profile & settings; Sign out. Customers get the same chip but only Profile / Payments / Sign out (no role switch).

### MANAGEMENT — `Zoomez Management Hi-Fi.dc.html` (standalone: `standalone/Zoomez Management App.html`)
Bottom tabs: **Dash · Calendar · Inbox (badge) · Photos · More**.

1. **Dashboard (live-ops)** — wordmark + "6 / 8 suites" + account chip ("Corey ▾"); date + on-shift staff; a row of biscuit approval-count pills (2 bookings / 1 claim / 2 messages); an **Overdue** coral card (Bella insulin +38m, Ping/Reassign); a "Live board" list of upcoming tasks with assignee; an "In residence" row of dog chips (Cooper flagged coral "?").
2. **Capacity calendar + approvals** — a 6-day capacity strip (per-day count + OK/**FULL** color); "Pending requests · 2": Rocky (coral **overlaps FULL nights** warning; Deny/Waitlist/Approve) and Luna (space OK but **waiver not signed / no deposit** → Approve **disabled**, "Request waiver" offered).
3. **Inbox oversight (periscope + takeover)** — a thread between an owner and a staffer, viewed by management with a "Watching" eye pill and a "Viewing silently · Jack can't see you · logged" notice; an "Unanswered 40m · SLA breach at 60m" line; and a **slide-to-take-over** control (coral chevrons, "Slide to take over the thread") with softer "Nudge Jack" / "Suggest an answer" options offered first. THE key oversight differentiator.
4. **Live task board** — "7 / 11 done" badge; an **Overdue** coral card (Ping/Reassign/**Mark done***); Upcoming timed list; "Done today" list with checkmarks, assignee, note & "+photo"; footnote: "* A management override is flagged and written to the audit log."
5. **Reports + audit log** — an Occupancy bar chart (peak days lagoon-filled), a Revenue card (boarding/upsells/total + a biscuit "$560 outstanding" chase row), a per-staff on-time list, and a **dark-lagoon append-only Audit log** (who did what, when: approvals, thread takeovers, med overrides).

## Interactions & Behavior
- **Booking is a request, not instant** — customer submits → management approves/denies/waitlists (capacity-aware; FULL-night overlap must trigger an overbook-confirm, and unsigned-waiver/no-deposit gates Approve).
- **Report card story** — tapping a photo on the postcard opens the full-bleed story viewer; tap sides to flip, swipe down to close.
- **Add-task** slots into the same timed rail as scheduled tasks and fires the same on-shift alerts; every ad-hoc task records "added by <staff>, <time>".
- **Task completion** is an audited who/when/outcome entry (Given/Refused/Skipped + optional note/photo). A management "Mark done" override is flagged in the audit log.
- **Oversight escalation**: silent view → nudge/suggest → **take over** (deliberate slide gesture; hard to trigger accidentally). Taking over mutes+notifies the staffer and writes to the audit log.
- **Shift claim**: first-come claim → optimistic "Pending · you" lock → management confirmation. Overlaps with the claimer's existing shift are surfaced.
- **Upsells** (payment screen) recalc the running total live and quietly create staff tasks.
- **Role switch** via account chip; Manager view is PIN-gated so a shared phone can't wander into approvals.
- Standard motion: hover lift + float shadow; press scale 0.98; 150/250/450ms ease-out.

## State Management
Suggested state per view (implement with the codebase's state layer):
- **Session/account**: current user, role (`customer` | `staff` | `manager`), `managerUnlocked` (PIN), active dog/owner context.
- **Customer**: stays[] (status: requested/approved/in-stay/checked-out), deposit paid flag, invoices[], report cards[], pets[] (feeding/meds/vax/waiver), message threads[].
- **Staff**: today's assigned tasks[] (scheduled + ad-hoc), shift assignments + open shifts[], in-residence dogs[], report-card drafts[], incidents[].
- **Management**: pending booking requests[], nightly capacity map, pending shift claims[], flagged/unanswered threads[] with oversight state (`viewing`/`joined`/`takenOver`), live task board (same task store as staff, read + override), reports aggregates, **append-only audit log[]**.
- Times are timezone-aware (America/Denver in the mocks). Task states: `scheduled → due → done | refused | skipped | overdue`.

## Assets
- **Fonts**: Instrument Serif + Figtree (Google Fonts).
- **Icons**: Lucide (see list above).
- **Photography**: none exists yet — all photos are seaglass placeholders (a Lucide glyph on `--seaglass` tint). Replace with warm golden-hour, dog-eye-level, coastal imagery at 28px radius. Dog avatars should become the owner's uploaded pet photo.
- **Logo**: typographic wordmark only.

## Files
- `Zoomez Customer Hi-Fi.dc.html`, `Zoomez Staff Hi-Fi.dc.html`, `Zoomez Management Hi-Fi.dc.html` — source prototypes (exact structure/copy/values; read, don't port the runtime).
- `standalone/Zoomez Customer App.html`, `standalone/Zoomez Staff App.html`, `standalone/Zoomez Management App.html` — self-contained builds; open in any browser to view the finished pixels offline.
- `design-system-tokens/colors.css`, `typography.css`, `spacing.css`, `effects.css` — the exact token values.
- `Zoomez Wireframes.dc.html` — earlier low-fi exploration (context only; not the visual target).
