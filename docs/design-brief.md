# Design Brief

*For the UI designer.* This app's **architecture, components, data model, and screen intent** are
decided (see the sibling docs); the **visual/interaction design is open** and is what this brief hands
off. Below are the three role-based views, their information architecture, and a screen-by-screen
inventory with purpose, key elements, interactions, and the app components that back each screen. The
ASCII blocks are **lo-fi placeholders to convey layout and content, not visual direction** — treat them
as wireframe intent, then design freely.

## What we're building

One installable **PWA** with **three role-based views** behind one login. Mobile-first, one-handed,
fast on cheap Android phones and iOS Safari. It replaces a dog boarding business's group texts + manual
calendar. See [`architecture-and-components.md`](architecture-and-components.md) for the stack and
[`data-model.md`](data-model.md) for the entities behind these screens.

## Design principles

- **Mobile-first PWA, installable.** Bottom tab bar, thumb-reachable. iOS "Add to Home Screen" coach
  mark (don't hard-block un-installed users). Declarative Web Push (iOS 18.4+) for staff/owners.
- **Three tones, one system.** *Customer* = warm, reassuring, minimal (they barely want to install).
  *Staff* = glanceable, one-handed, fast task completion. *Management* = denser, control-oriented.
- **The differentiators deserve the most design care:** the per-dog **med/task checklist**, the
  **open-shift claim** flow, the **photo report card**, and the management **oversight / take-over** of
  any conversation. Call these out visually.
- **Deep links land on the exact screen** (a report card, an unpaid deposit) from SMS/email nudges.
- **Full-res photos** are a feature (beats MMS). **iOS lock-screen push can't show an image thumbnail** —
  design text-preview + badge for notifications.
- **Real content, not lorem.** Dogs have names, breeds, meds, and date ranges — design with realistic
  density (a busy holiday week, an overdue insulin dose, a thread being taken over).
- **Tokens are open.** No brand palette is prescribed here — propose one (light + dark). Pair well with
  the chosen component layer (Tailwind + shadcn/ui / Radix).

## Personas & primary flows

- **Customer** — request a date-range stay → get approval → receive photo report cards → message the
  team → pay deposit/invoice + buy add-ons → sign waiver → manage pets/vax.
- **Staff** — claim an open shift → see who/which dogs are here → work the per-dog timed checklist →
  post photos / build a report card → message customers (from the app) → report incidents.
- **Management** — approve booking requests & shift claims → **view and take over** any thread → watch
  the live task board → review/send report cards → run reports & audit.

---


## Customer — dog owner (iOS-first PWA)

**Information architecture / navigation.** Bottom tab bar (installed PWA shell, thumb-reachable, 5 tabs) + a top app bar with the business name and a bell for push/notification history. Tabs: [Home] (upcoming stay + latest report card + action nudges), [Book] (start/continue a date-range request), [Messages] (owned in-app threads with staff/management), [Pets] (per-dog profiles, vax records, waivers), [Account] (payment methods, invoices, notifications, install prompt). Deep links from SMS/email nudges land on the exact screen (e.g. a report card or an unpaid deposit) and, if not installed, show a lightweight "Add to Home Screen" coach mark rather than blocking. Badge counts appear on Messages (unread) and Home (action needed: pay deposit, sign waiver, missing vax).


### Home / Stay Dashboard

*One warm landing screen that answers 'is my dog OK and what do I need to do?' — shows the current/next stay with its approval status, the freshest photo report card, and any action nudges (deposit, waiver, expiring vax). Zero-friction entry point deep-linked from nudge notifications.*

```
+------------------------------------------+
|  Corry & Brette's Dog Boarding      (o) |
+------------------------------------------+
|                                          |
|  Hi Sarah! Biscuit's stay is coming up.  |
|                                          |
|  +------------------------------------+  |
|  | UPCOMING STAY                      |  |
|  | Biscuit (Beagle)                   |  |
|  | Jul 4 - Jul 6  (2 nights)          |  |
|  | Status: [ APPROVED ]  green dot    |  |
|  | Drop-off Fri ~9:00 AM              |  |
|  +------------------------------------+  |
|                                          |
|  ! ACTION NEEDED (2)                     |
|  +------------------------------------+  |
|  | [!] Pay deposit  $40    > Pay now  |  |
|  | [!] Sign boarding waiver > Review  |  |
|  +------------------------------------+  |
|                                          |
|  LATEST REPORT CARD                      |
|  +------------------------------------+  |
|  | [ dog photo thumb ]  Yesterday 4pm |  |
|  | 'Biscuit had a great day!' >View   |  |
|  +------------------------------------+  |
|                                          |
|  [ + Book another stay ]                 |
+------------------------------------------+
| Home   Book   Messages   Pets   Account  |
+------------------------------------------+
```

- **Key elements:** Upcoming-stay card with status pill (Requested / Approved / In-stay / Complete) and color dot; Action Needed list with per-item deep CTAs (Pay, Sign, Upload vax); Latest report card preview thumbnail; primary 'Book another stay' button; bell icon opening notification history.
- **Interactions:** Status pill live-updates when management approves (Declarative Web Push). Tapping an Action item routes straight to payment/waiver/vax flow and the item disappears when resolved. Report card preview opens full report card. Pull-to-refresh re-syncs stay + thread state.
- **Backed by:** booking engine + capacity calendar (stay + status), report card feed, invoicing/deposit module, waiver e-sign, push (iOS Declarative Web Push 18.4+), notification history service


### Book a Stay (date-range request)

*Low-friction date-range reservation request (boarding is date-range with capacity, NOT slots). Owner picks dogs, dates, drop-off/pick-up windows, add-ons, sees a live capacity/availability signal, and submits a REQUEST that management approves.*

```
+------------------------------------------+
|  <  Book a Stay                          |
+------------------------------------------+
|  Which dog(s)?                           |
|  [x] Biscuit (Beagle)                    |
|  [ ] Bella (Golden Retriever)            |
|  [ + Add a pet ]                         |
|                                          |
|  Dates                                   |
|   Jul 2026        [ < ]   [ > ]          |
|   S  M  T  W  T  F  S                     |
|         1  2  3 [4][5][6] 7               |
|   selected: Jul 4 -> Jul 6  (2 nights)   |
|   Availability: OPEN (3 of 6 spots)      |
|                                          |
|  Drop-off      [ Fri ~9:00 AM  v ]       |
|  Pick-up       [ Sun ~5:00 PM  v ]       |
|                                          |
|  Add-ons (optional)                      |
|  [ ] Bath before pick-up      +$25       |
|  [ ] Extra playtime / day     +$10       |
|  [ ] Nail trim                +$15       |
|                                          |
|  Notes for the team                      |
|  [ Biscuit is shy with big dogs...    ]  |
|                                          |
|  Est. total: $120 + $40 deposit          |
|  [   Request this stay   ]               |
+------------------------------------------+
```

- **Key elements:** Multi-select dog checklist; range-select month calendar with per-day capacity coloring; drop-off / pick-up window pickers; optional add-on upsell checklist with prices; free-text notes; live estimate + deposit line; single primary submit.
- **Interactions:** Selecting a range queries capacity; days at capacity render disabled/red with a 'Full — join waitlist?' option. Add-ons update the estimate inline. Submit creates a 'Requested' stay, fires a management approval task, and routes to a confirmation state. Missing waiver/vax surfaces as a soft warning but does not block the request.
- **Backed by:** booking engine + capacity calendar, add-on/upsell catalog, waitlist queue, management approval workflow, pricing/estimate service


### Stay Detail & Approval Status

*The full lifecycle view of a single reservation: request -> approved/declined -> in-stay -> complete. Consolidates dates, dogs, itemized cost, deposit/invoice state, and a timeline so the owner always knows exactly where things stand.*

```
+------------------------------------------+
|  <  Biscuit - Jul 4-6           [ ... ]  |
+------------------------------------------+
|  STATUS TIMELINE                         |
|  (o) Requested     Jun 28                |
|  (o) Approved      Jun 29  <- you're here|
|  ( ) Check-in      Jul 4                 |
|  ( ) In stay                             |
|  ( ) Checked-out   Jul 6                 |
|                                          |
|  DOGS                                     |
|  - Biscuit (Beagle, 24 lb)               |
|    Meds: Rimadyl 75mg AM  [set]          |
|                                          |
|  COST                                     |
|  Boarding 2 nights        $110           |
|  Bath add-on               $25           |
|  ----------------------------            |
|  Total                    $135           |
|  Deposit (due now)         $40  UNPAID   |
|  [   Pay $40 deposit   ]                  |
|                                          |
|  DROP-OFF / PICK-UP                       |
|  Fri Jul 4  ~9:00 AM                      |
|  Sun Jul 6  ~5:00 PM                      |
|                                          |
|  [ Message the team ]  [ Cancel request ]|
+------------------------------------------+
```

- **Key elements:** Vertical status timeline with current-step marker; per-dog summary incl. med schedule confirmation; itemized cost with deposit/balance state; drop-off/pick-up times; secondary message + cancel actions; overflow menu for edit-request.
- **Interactions:** Timeline nodes fill as management/staff advance the stay. 'Pay deposit' opens the payment sheet then flips deposit to PAID. Cancel before approval withdraws the request; after approval it opens a message-the-team flow (policy-gated). Edit re-opens the booking form pre-filled.
- **Backed by:** booking engine + capacity calendar, invoicing/deposit module, per-dog med schedule store, in-app messaging, status/notification service


### Photo Report Card

*The emotional payoff and retention driver: a per-day, per-dog 'report card' staff post during the stay — full-res photos, mood/activity chips, meals & meds completed, and a warm note. Reassures the anxious owner their dog is happy and cared for.*

```
+------------------------------------------+
|  <  Biscuit's Report Card                |
|     Fri Jul 4 - Day 1 of 2               |
+------------------------------------------+
|  +------------------------------------+  |
|  |                                    |  |
|  |        [  full-res photo  ]        |  |
|  |                                    |  |
|  |         1 / 4     o o o o          |  |
|  +------------------------------------+  |
|                                          |
|  Today Biscuit was...                    |
|  ( Playful )( Cuddly )( Ate it all )     |
|                                          |
|  MEALS & MEDS                            |
|  [x] 8:00 AM  Breakfast - full           |
|  [x] 8:05 AM  Rimadyl 75mg - given       |
|  [x] 12:30 PM Midday potty + walk        |
|  [x] 5:30 PM  Dinner - full              |
|                                          |
|  A note from Brette                      |
|  'Biscuit made a friend today - he and   |
|   Bella napped in the sunny spot. Total  |
|   sweetheart!'                           |
|                                          |
|  [  Heart <3  ]   [  Reply to team  ]    |
+------------------------------------------+
```

- **Key elements:** Swipeable full-res photo carousel with dots; mood/activity chips; completed meals & meds checklist mirrored from staff task log (with real timestamps); named staff note; react (heart) + reply buttons that thread into Messages.
- **Interactions:** Swipe photos; tap to view fullscreen/zoom or save. Heart sends a lightweight reaction to staff; Reply opens the stay's message thread pre-scoped to this report card. New report cards arrive via push and badge Home. Meds/meals rows are read-only reflections of the staff checklist completion events.
- **Backed by:** report card feed (staff-authored), full-res media storage/CDN on VPS, per-dog med/task checklist events, in-app messaging reactions + threads, push


### Messages (owned in-app thread)

*iMessage-quality, owned in-app conversation with the boarding team (Postgres threads, NOT SMS). Read receipts, typing indicators, full-res photos. Owner never sees the staff-vs-management seam or oversight/takeover happening behind it.*

```
+------------------------------------------+
|  <  Corry & Brette's Team        (i)     |
|     Biscuit - Jul 4-6 stay               |
+------------------------------------------+
|                                          |
|            Jul 4  9:12 AM                 |
|  +----------------------------------+     |
|  | Dropped Biscuit off - he has his |     |
|  | blue blanket in the bag :)       |     |
|  +----------------------------------+ (me)|
|                          Read 9:13 AM     |
|                                          |
|  +--------------------------------+       |
|  | Got it! Blanket in his crate.  |       |
|  | He's already sniffing around.  |       |
|  |            - Brette            |       |
|  +--------------------------------+       |
|  +--------------------------------+       |
|  |     [ full-res photo thumb ]   |       |
|  +--------------------------------+       |
|                                          |
|  ( Team is typing... )                    |
|                                          |
+------------------------------------------+
|  [ + ] [ Type a message...        ] [>]  |
+------------------------------------------+
```

- **Key elements:** Single team thread scoped to the active stay; sent/read receipts; typing indicator; inbound named-staff bubbles; full-res photo attachments; attach (+) for photos/vax; info (i) for stay context. Sender shown as the business/staff name — management takeover is invisible to the owner.
- **Interactions:** Send text/photo -> optimistic bubble -> delivered/read via websocket. Typing broadcasts both ways. Push on new inbound message (deep-links here). If management takes over the thread, replies still appear under the same team identity, preserving continuity. History persists across stays under the same thread.
- **Backed by:** in-app messaging (Postgres threads + websockets/read-receipts/typing), full-res media storage, management oversight + takeover (invisible to customer), push


### Pay Deposit / Invoice + Add-on Upsells

*Frictionless money screen: pay the deposit or final invoice, see the itemized balance, and impulse-buy add-on upsells (bath, extra playtime, nail trim) that get appended to the stay and re-invoiced.*

```
+------------------------------------------+
|  <  Payment - Biscuit Jul 4-6            |
+------------------------------------------+
|  INVOICE #1042                            |
|  Boarding 2 nights          $110          |
|  Bath add-on                 $25          |
|  ------------------------------           |
|  Subtotal                   $135          |
|  Deposit paid              - $40          |
|  Balance due                $95           |
|                                          |
|  ADD SOMETHING NICE?                      |
|  +------------------------------------+   |
|  | [+] Extra playtime / day    +$10   |   |
|  | [+] Nail trim               +$15   |   |
|  | [+] Send-home photo book     +$20   |  |
|  +------------------------------------+   |
|                                          |
|  PAY WITH                                 |
|  (o) Visa ****4242                        |
|  ( ) Add new card                         |
|                                          |
|  [        Pay balance  $95        ]       |
|                                          |
|  Secure - receipt sent to your email      |
+------------------------------------------+
```

- **Key elements:** Itemized invoice with deposit credit and balance; add-on upsell cards with '+' that recalc the total live; saved payment method selector; single pay CTA showing the exact amount; receipt/security reassurance line.
- **Interactions:** Tapping an add-on '+' appends it to the stay, updates the invoice + total instantly, and notifies staff of the new task. Pay runs the charge, flips the invoice to PAID, clears the Home action nudge, and emails a receipt. Add-card opens a tokenized card entry sheet.
- **Backed by:** invoicing/deposit module, add-on/upsell catalog (writes tasks back to staff checklist), payment processor integration (tokenized, PCI-outsourced), notification/receipt service


### Pets: Profile, Vaccinations & Waiver

*The owner-maintained record of each dog: breed/weight/vet, feeding & med schedule, uploaded vaccination proofs with expiry tracking, and the signed boarding waiver. Gates booking readiness so the team never has to chase paperwork by text.*

```
+------------------------------------------+
|  <  Biscuit                     [ Edit ] |
+------------------------------------------+
|   [ dog photo ]  Biscuit                  |
|                  Beagle - 24 lb - M       |
|                  Vet: Elm St Animal Hosp  |
|                                          |
|  FEEDING & MEDS                           |
|  - Breakfast 8:00 AM (1 cup)              |
|  - Rimadyl 75mg - 8:00 AM w/ food         |
|  - Dinner 5:30 PM (1 cup)                 |
|  [ + Add feeding / med ]                  |
|                                          |
|  VACCINATIONS                             |
|  [x] Rabies      exp Mar 2027   [view]    |
|  [x] DHPP        exp Jan 2027   [view]    |
|  [!] Bordetella  EXPIRED Jun'26 [update]  |
|  [ + Upload vaccination record ]          |
|                                          |
|  WAIVER                                   |
|  [x] Boarding waiver signed Jun 28        |
|      [ view signed copy ]                 |
|                                          |
|  [ + Add another pet ]                    |
+------------------------------------------+
```

- **Key elements:** Pet header (photo, breed, weight, vet); structured feeding & med schedule (times/doses feeding the staff checklist); vaccination list with expiry status chips (valid / expiring / expired) + document viewer; waiver status with signed-copy link; add-pet action.
- **Interactions:** Upload vax opens camera/file picker -> stores image/PDF, parses/records expiry, clears any Home nudge; expired vax shows red '[!]' and blocks/soft-warns new bookings. Editing meds updates the schedule that drives on-shift staff timed alerts. Unsigned waiver deep-links to the e-sign flow. Add pet creates a new profile usable in Book.
- **Backed by:** pet profile store, per-dog med/feeding schedule (routes timed alerts to on-shift staff), document/media storage for vax, expiry-tracking + booking-gate rules, waiver e-sign, Home action-nudge engine


---


## Staff — employee / dog caregiver (Android + iOS PWA)

**Information architecture / navigation.** Persistent bottom tab bar (5 items), thumb-reachable, with badge counts. A compact top app bar shows current-shift status + a quick "SOS / Incident" button.

Bottom tabs:
1. Today (default landing) — on-shift dashboard: who's here now, next timed alert, quick jump to checklist.
2. Shifts — open-shift board (claim first-come + approval) + My Schedule (toggle).
3. Dogs — roster of dogs currently boarding; tap a dog → per-dog med/feeding/task checklist + report card builder.
4. Messages — in-app customer threads assigned to me (owned messaging; management can view/take over, shown with an oversight banner). Never uses my personal phone number.
5. Me — profile, availability, notification/push settings, incident history.

Global: floating "+ Log" affordance on Today/Dogs for fast task completion + photo post. Push notifications (iOS Declarative Web Push 18.4+) route timed med/feed/task alerts to the on-shift staffer and deep-link straight into that dog's checklist item.


### Today (On-Shift Dashboard)

*The default landing screen when a staffer opens the PWA during a shift. Answers in one glance: am I on shift, who is here, and what is due next. Everything is a deep-link into action.*

```
+------------------------------------------+
| ON SHIFT  7a-3p   Sat Jul 5   [!] SOS   |
+------------------------------------------+
|  NEXT UP                                 |
|  +------------------------------------+  |
|  | 8:00 AM  Rimadyl 75mg  ~ due 4m    |  |
|  | Bella - Golden Retriever           |  |
|  |            [ Do it ]  [ Snooze ]   |  |
|  +------------------------------------+  |
|                                          |
|  HERE NOW (5 dogs)            [see all]  |
|  o Biscuit    Beagle    Jul 4-6   2 due |
|  o Bella      Golden    Jul 3-7   1 due |
|  o Cooper     Lab mix   Jul 5-5   0 due |
|  o Luna       Poodle    Jul 2-6   0 due |
|  o Max        Boxer     Jul 5-8   ! med |
|                                          |
|  TODAY'S PROGRESS                        |
|  Tasks  9/14 done  [#####-----]          |
|  Photos posted: 3    Report cards: 1     |
+------------------------------------------+
| Today | Shifts | Dogs | Msgs(2) |  Me   |
+------------------------------------------+
```

- **Key elements:** On-shift status pill (with shift window + date); persistent SOS/Incident button; 'Next Up' hero card for the single most-imminent timed alert with Do-it/Snooze; 'Here Now' live roster with per-dog due-count badges; day progress meter (tasks done, photos, report cards); bottom tab bar with unread badges.
- **Interactions:** 'Do it' opens the checklist item's completion sheet (dose confirm + time-stamp). 'Snooze' offers 10/20/30 min and re-routes the push. Tapping a dog row opens its checklist. SOS opens incident report. Pull-to-refresh re-syncs. If not on shift, the status pill reads 'OFF — see Shifts' and Next Up is replaced by an open-shift teaser.
- **Backed by:** open-shift board (shift state) + per-dog timed task/med engine (scheduler + local-time/zone store) + capacity/roster from booking engine + Declarative Web Push routing to on-shift staffer.


### Open-Shift Board (Claim + Await Approval)

*Uber-style board of unfilled shifts. Staff claim first-come; a claim is provisional until management approves. This claim flow is a core differentiator and must show state clearly.*

```
+------------------------------------------+
|  Shifts        [ Open ]  My Schedule     |
+------------------------------------------+
|  OPEN SHIFTS (first-come + approval)     |
|                                          |
|  Sun Jul 6                               |
|  +------------------------------------+  |
|  | 7:00a - 3:00p   Morning care       |  |
|  | 6 dogs boarding - 2 meds due       |  |
|  | Pay: $ per shift     OPEN          |  |
|  |               [   Claim shift   ]  |  |
|  +------------------------------------+  |
|                                          |
|  Mon Jul 7                               |
|  +------------------------------------+  |
|  | 3:00p - 9:00p   Evening + feed     |  |
|  | 5 dogs - overlaps your 1p-3p  [i]  |  |
|  |            PENDING APPROVAL  ~you   |  |
|  |               [  Withdraw claim  ] |  |
|  +------------------------------------+  |
|                                          |
|  Tue Jul 8   7a-3p    CLAIMED by Brette |
|  Wed Jul 9   7a-3p    [ Claim shift ]   |
+------------------------------------------+
| Today | Shifts | Dogs | Msgs | Me       |
+------------------------------------------+
```

- **Key elements:** Open/My-Schedule segmented toggle; per-shift card with window, dog count + workload preview (meds due), pay; state chips: OPEN / PENDING APPROVAL (yours) / CLAIMED (by name) / CONFLICT; overlap warning [i] against your existing schedule; Claim / Withdraw actions.
- **Interactions:** Claim -> optimistic lock (first-come): card flips to 'PENDING APPROVAL ~you' and notifies management. If someone claimed a millisecond earlier, you get 'Just taken' and the card shows CLAIMED. Management approve -> card moves to My Schedule + push 'You're on Jul 6'. Reject -> returns to OPEN with a note. Withdraw before approval releases the lock. Overlap conflicts block claim with an explainer.
- **Backed by:** open-shift board (claim/approval state machine, atomic first-come lock) + scheduling/availability + management approval queue + push notifications.


### Dog Roster (Here Now)

*Scannable list of every dog currently boarding, sorted by urgency, so a staffer can pick the next dog to attend to.*

```
+------------------------------------------+
|  Dogs Here Now (5)         [ + Photo ]   |
+------------------------------------------+
|  Sort: Urgency v          Search [    ]  |
+------------------------------------------+
|  ! Bella  Golden Retriever               |
|    Jul 3-7  * Rimadyl 8:00a OVERDUE 3m   |
|    Feed 5:30p - Meds: yes                 |
|  ----------------------------------------|
|    Biscuit  Beagle                        |
|    Jul 4-6   Next: lunch feed 12:00p     |
|    2 tasks due   Allergy: chicken        |
|  ----------------------------------------|
|    Max  Boxer                             |
|    Jul 5-8   ! Separate at feeding       |
|    Insulin 6:00p                          |
|  ----------------------------------------|
|    Cooper  Lab mix   Jul 5-5   all done  |
|    Luna    Poodle    Jul 2-6   all done  |
+------------------------------------------+
| Today | Shifts | Dogs | Msgs | Me       |
+------------------------------------------+
```

- **Key elements:** Count header; sort (urgency/name/checkout) + search; per-dog card: name, breed, stay date-range, next/overdue timed item with countdown, allergy/behavior flags (e.g. 'Separate at feeding', 'Allergy: chicken'), all-done state; quick + Photo entry.
- **Interactions:** Tap card -> per-dog checklist + profile. Overdue items render red with elapsed time. Long-press -> quick actions (post photo, message owner, start report card). '+ Photo' opens camera/gallery multi-select attributed to that dog.
- **Backed by:** booking engine (active reservations + date ranges) + per-dog med/task engine (due/overdue state) + dog profile (flags, allergies, feeding notes).


### Per-Dog Med/Feeding/Task Checklist (with completion logging)

*The clinical core: a timed, per-dog checklist of medications, feedings, and tasks with reminders and auditable completion logging. Differentiator — must be precise and safe.*

```
+------------------------------------------+
| < Bella - Golden Retriever    [msg own] |
| Stay Jul 3-7  Owner: Sarah M            |
| Flags: Arthritis - give w/ food         |
+------------------------------------------+
|  TODAY - Sat Jul 5   (America/Denver)    |
|                                          |
|  [x] 6:00 AM  Breakfast 1 cup           |
|       done 6:04a by You                  |
|  [x] 8:00 AM  Rimadyl 75mg  w/ food     |
|       done 8:07a by You  [note+]         |
|  [ ] 12:00 PM Lunch 1/2 cup             |
|       due in 2h 11m                       |
|  [ ] 2:00 PM  Ear drops both ears       |
|       due in 4h                           |
|  [!] 8:00 PM  Rimadyl 75mg   evening    |
|       routes to on-shift staff           |
|                                          |
|  +------------------------------------+  |
|  | Complete: Rimadyl 75mg             |  |
|  | Time [ 8:07 AM ]  auto-now         |  |
|  | ( ) Given  ( ) Refused ( ) Skipped |  |
|  | Note: ______________  [ Photo ]    |  |
|  |            [   Confirm & log   ]   |  |
|  +------------------------------------+  |
+------------------------------------------+
```

- **Key elements:** Dog header w/ stay + owner + medical flags; timezone label (stored local time + zone); timeline of items with state ([x] done w/ who+when, [ ] pending w/ countdown, [!] upcoming that will route to on-shift staff); completion sheet with time (defaults to now, editable), outcome radio (Given/Refused/Skipped), free-text note, optional photo proof; per-item note thread.
- **Interactions:** Tap pending item -> completion sheet. Confirm & log writes an immutable audit entry (item, dose, staffer, timestamp, outcome). 'Refused/Skipped' requires a note and can flag the owner/management. Overdue items escalate: re-push to on-shift staff, then to management. Editing a logged time keeps original as audit trail. Completing feeds/meds increments Today progress.
- **Backed by:** per-dog timed med/feeding/task engine (scheduler storing local time + IANA zone) + append-only completion audit log + push routing to on-shift staff w/ management escalation.


### Report Card Builder

*Compose a shareable daily 'report card' for the owner from photos + quick-tap highlights. A delight feature that turns logged activity into a customer-facing update.*

```
+------------------------------------------+
| < Report Card - Biscuit   Sat Jul 5     |
+------------------------------------------+
|  PHOTOS  (tap to add, drag to reorder)   |
|  [IMG][IMG][IMG][ + ]                     |
|                                          |
|  MOOD today                              |
|  ( )Sleepy ( )Calm (o)Playful ( )Anxious |
|                                          |
|  ATE?    (o) All  ( ) Some  ( ) None     |
|  POTTY   [Pee x3] [Poop x2]  normal v    |
|  PLAY    [+Fetch] [+Zoomies] [+Naps]     |
|                                          |
|  BEST MOMENT                             |
|  [ Made a new friend with Luna at the   |
|    fence - total zoomies! ______ ]       |
|                                          |
|  Auto-pulled: Breakfast 6:04a, Walk 10a  |
|  ( ) Include today's care log            |
|                                          |
|  [ Save draft ]      [ Send to owner ]   |
+------------------------------------------+
```

- **Key elements:** Multi-photo picker w/ reorder; mood selector; ate/potty/play quick-tap chips; free-text 'best moment'; auto-pulled care-log summary from the checklist with include toggle; Save draft vs Send to owner.
- **Interactions:** Photos upload full-res (async, retry on flaky VPS link). Chips are single/multi tap. 'Send to owner' posts the card into the owner's in-app message thread + fires a push/email nudge. Drafts persist per dog per day. Sent cards become read-only with a delivered/read receipt. Management can review before/after send.
- **Backed by:** media/photo pipeline (full-res upload + thumbnails) + report-card composer + in-app messaging delivery + care-log data reused from the checklist engine.


### Customer Message Thread (with oversight banner)

*iMessage-quality in-app conversation with a dog owner, sent from the app identity (never the staffer's personal phone). Must visibly show that management can view/take over.*

```
+------------------------------------------+
| < Sarah M  (Bella)        [dog profile] |
| ~ Oversight: Corry may view this thread |
+------------------------------------------+
|                    Any update on Bella's |
|                    limp today?  10:02a   |
|                                 Read     |
|                                          |
|  She's doing great - no limp after her   |
|  morning Rimadyl. Photo below  10:15a    |
|  [ IMG full-res ]                         |
|                                          |
|                    Aww thank you!! 10:16a|
|                                          |
|  Sarah is typing...                       |
|                                          |
|  [ Report card ] [ Photo ] [ Template ]  |
| +--------------------------------------+ |
| | Message as HappyTails...        [>] | |
| +--------------------------------------+ |
+------------------------------------------+
```

- **Key elements:** Owner + dog context header + quick jump to dog profile; persistent oversight banner (management may view/take over); message bubbles with read receipts + typing indicator; full-res inline photos; quick actions (attach report card, photo, canned templates); composer that sends as the business identity, not the staffer.
- **Interactions:** Send writes to Postgres thread (owned messaging); delivery + read receipts sync; typing indicators over websocket. Photos attach full-res. Templates insert canned replies. If management 'takes over', a system line appears ('Corry joined this conversation') and the composer may lock for the staffer. SMS/email to the owner are only nudge links back into the portal.
- **Backed by:** in-app messaging (Postgres threads, websocket presence/typing/receipts) + management oversight/takeover layer + media pipeline + push/email nudge service.


### Incident Report

*Fast, structured reporting of a bite, injury, escape, or illness — reachable from the SOS button on any screen. Creates an auditable record and alerts management immediately.*

```
+------------------------------------------+
| < Report Incident            Sat Jul 5  |
+------------------------------------------+
|  TYPE                                    |
|  [Injury][Bite][Escape][Illness][Other]  |
|                                          |
|  DOG(S) INVOLVED                         |
|  [x] Max (Boxer)   [ ] Bella   [+add]    |
|                                          |
|  WHEN   [ 1:42 PM ]  auto-now            |
|  SEVERITY  ( )Minor (o)Moderate ( )Severe|
|                                          |
|  WHAT HAPPENED                           |
|  [ Max nipped at Cooper during feeding; |
|    no broken skin. Separated both. ____ ]|
|                                          |
|  PHOTOS   [IMG][ + ]                      |
|  ACTION TAKEN                            |
|  [x] Separated  [ ] First aid  [ ] Vet  |
|                                          |
|  [ ] Notify owner now                    |
|         [   Submit - alerts mgmt   ]     |
+------------------------------------------+
```

- **Key elements:** Incident type chips; multi-dog selector; auto timestamp (editable); severity radio; description; photos; action-taken checklist; 'Notify owner now' toggle; prominent submit that alerts management.
- **Interactions:** Submit writes an immutable incident record and pushes management immediately (severity-weighted). 'Notify owner now' drafts an owner message for staff/management to send. Severe incidents can require a follow-up before closing. Draft autosaves so an urgent report is never lost on a flaky connection.
- **Backed by:** incident reporting store (append-only) + management alert/escalation push + in-app messaging (owner notify) + media pipeline.


---


## Management — Corry / Brette / mom (oversight)

**Information architecture / navigation.** Bottom tab bar (5 primary, control-dense) + top context bar. Tabs: [Dashboard] [Calendar] [Inbox*] [Photos] [More]. The "More" tab opens a management drawer: Approvals (bookings + shift claims), Reports, Staff Schedule, Audit Log, Customers & Pets, Rates & Upsell Catalog, Settings. A persistent top bar shows current occupancy (e.g. "6/8 dogs") and a red badge counter that aggregates everything needing a human decision (pending booking requests + pending shift claims + flagged/unanswered customer messages). Inbox has an "oversight mode" toggle so a manager can watch all staff<->customer threads, not just their own. Management role sees every object; staff-scoping filters are OFF by default but available as chips.


### Oversight Dashboard

*Single control surface: what's in-house right now, what needs a decision, and money/occupancy at a glance. The manager's home base — every red item is one tap from resolution.*

```
+--------------------------------------------+
| Sunrise Dog Boarding      6/8 dogs   (M) |
| Wed Jul 3            [needs you: 5] (!)  |
+--------------------------------------------+
|  NEEDS A DECISION                          |
| +----------------------------------------+ |
| | 2 booking requests      [Review >]    | |
| | 1 shift claim to approve [Review >]   | |
| | 2 flagged messages       [Open >]     | |
| +----------------------------------------+ |
|                                            |
|  IN-HOUSE NOW (6)              [Calendar>] |
| +----------------------------------------+ |
| | Biscuit  Jul1-4  Jack (staff)  meds!  | |
| | Bella    Jul2-6  Jack          ok     | |
| | Cooper   Jul3-5  --UNASSIGNED-- (!)   | |
| | +3 more...                    [see]   | |
| +----------------------------------------+ |
|                                            |
|  TODAY'S TASK LOAD                          |
| |####### 7 of 11 done  4 upcoming|        |
|  next: 4:00 PM Biscuit - Rimadyl 75mg      |
|                                            |
|  QUICK NUMBERS (Jul)                        |
| | Occupancy 74% | Rev $4,180 | Owed $560 | |
+--------------------------------------------+
| [Dash] [Cal] [Inbox3] [Photos] [More]      |
+--------------------------------------------+
```

- **Key elements:** Occupancy pill (6/8) and aggregated 'needs you' badge in the header; a decisions card that itemizes each queue with counts; in-house roster with per-dog staff assignment and a meds/unassigned flag; today's task-completion meter with next timed alert; a three-up KPI strip (occupancy %, revenue MTD, outstanding balance).
- **Interactions:** Tapping any decision row deep-links to that queue (booking approvals / shift approvals / flagged inbox). 'Cooper --UNASSIGNED--' is tappable -> assign staff sheet. The task meter taps through to the live task board. KPI tiles tap into Reports pre-filtered to the current month. Header occupancy pill opens the capacity calendar on today. All counts are live via web-push/websocket so the badge updates without refresh.
- **Backed by:** booking engine + capacity calendar (in-house + occupancy), approval queues (booking requests + open-shift board), in-app messaging oversight (flagged/unanswered), med/task scheduler (task load + next alert), reporting/aggregations service (KPI strip).


### Capacity Calendar & Booking Approvals

*See date-range occupancy against capacity, spot overbook risk, and approve/deny incoming booking requests without double-booking. Boarding is date-range reservations, not slots — this is the core scheduling control.*

```
+--------------------------------------------+
| < July 2026 >        Capacity: 8 dogs/night|
+--------------------------------------------+
|      Th  Fr  Sa  Su  Mo  Tu  We            |
|      3   4   5   6   7   8   9             |
| dogs 6   8*  8*  5   4   3   2             |
|      ok  FULL FULL ok  ok  ok  ok         |
|  * Jul4-5 at capacity - holiday            |
+--------------------------------------------+
|  PENDING REQUESTS (2)                       |
| +----------------------------------------+ |
| | Rocky - Lab (Diaz)                     | |
| | Jul 4 -> Jul 6  (2 nights)             | |
| | Overlaps FULL nights: Jul4, Jul5  (!)  | |
| | Notes: intact male, crate-trained      | |
| | Waiver: signed  Deposit: $50 held      | |
| |   [Deny]   [Waitlist]   [Approve]      | |
| +----------------------------------------+ |
| | Luna - Poodle (Kim)                    | |
| | Jul 9 -> Jul 12 (3 nights)  space ok   | |
| | Waiver: NOT signed (!) Deposit: none   | |
| |   [Deny]   [Request waiver] [Approve]  | |
| +----------------------------------------+ |
|  [+ Manual booking]   [Block dates]        |
+--------------------------------------------+
```

- **Key elements:** Month strip with per-night headcount vs capacity and FULL markers; capacity setting visible in header; pending-request cards each showing dog+owner, exact date range, nights, overlap-with-full warning, waiver + deposit status, and owner notes; approve/deny/waitlist actions; manual-booking and date-block escape hatches.
- **Interactions:** Approving a request that overlaps a FULL night triggers an overbook-confirm sheet (allow one-over vs deny). Approve -> reservation created, capacity recomputed, customer gets a portal push + the thread opens for confirmation. 'Waitlist' keeps deposit held and notifies if a night frees up. 'Request waiver' fires a signing link into the customer thread and holds the request. Tapping a night cell drills into that night's roster. Deny asks for an optional reason that is messaged to the owner.
- **Backed by:** booking engine + capacity calendar (date-range reservations, per-night capacity math), waiver/e-sign component, payments/deposits, in-app messaging (approval/deny notifications), audit log (who approved what).


### Shift Board & Claim Approvals

*Publish open shifts, watch staff claim them Uber-style (first-come), and approve/deny the claim — while seeing coverage gaps so no in-house night is left unstaffed.*

```
+--------------------------------------------+
| Staff Schedule        Coverage this week   |
| |Th ok|Fr GAP!|Sa ok|Su ok|Mo GAP!|      |
+--------------------------------------------+
|  OPEN SHIFTS                     [+ Post]  |
| +----------------------------------------+ |
| | Fri Jul4  7a-3p  6 dogs, 3 med rounds  | |
| | CLAIM PENDING: Maria R.  2m ago        | |
| |  Maria: 12 shifts, on-time 100%        | |
| |  Overlap conflict: none                | |
| |    [Deny]            [Approve claim]   | |
| +----------------------------------------+ |
| | Fri Jul4  3p-9p  6 dogs                | |
| |  claimed by: 2 staff (queue)           | |
| |   1. Jack T. (30s ago)  2. Maria R.    | |
| |   [Deny Jack]  [Approve Jack ->1st]    | |
| +----------------------------------------+ |
| | Mon Jul7  7a-3p  4 dogs   UNCLAIMED    | |
| |   [Nudge staff]   [Assign directly]    | |
| +----------------------------------------+ |
|  ASSIGNED (3)                     [show]   |
+--------------------------------------------+
```

- **Key elements:** Weekly coverage strip flagging GAP nights; open-shift cards showing time window, dog count, med-round load; claim state (pending / first-come queue with timestamps / unclaimed); claimant reliability stats and overlap-conflict check; approve/deny per claim; post-shift, nudge, and direct-assign controls.
- **Interactions:** First-come order is preserved: approving the #1 claimant assigns them and auto-releases the queue; approving a lower claimant requires a confirm ('skip Jack?') and is written to the audit log. Approve pushes the assignment to that staffer and links it to the shift's task checklist. Denying returns the shift to open. 'Assign directly' bypasses the claim flow for uncovered gaps. Coverage GAP flags are computed from in-house reservations minus assigned shifts.
- **Backed by:** open-shift board (post/claim/first-come queue), staff scheduling + coverage calc (reservations vs assignments), med/task scheduler (round load per shift, routing on assignment), audit log, push notifications.


### Inbox Oversight & Takeover

*THE oversight differentiator: view every staff<->customer thread read-only, then silently join or fully take over — a hard requirement that rules out E2EE. Flagged/unanswered threads surface first.*

```
+--------------------------------------------+
| Inbox   [All v]  Oversight: ON  [mine]     |
| filters: (Flagged)(Unanswered)(Med)(Bill) |
+--------------------------------------------+
| ! Diaz (Rocky)   staff: Jack               |
|   "is the deposit refundable if..."        |
|   unanswered 40m            [Open]         |
|--------------------------------------------|
|   Kim (Luna)     staff: Maria              |
|   "thank you!! she looks so happy" 2m      |
|--------------------------------------------|
| ! Ortiz (Bella)  staff: Jack   MED note    |
|   "she skipped breakfast"     [Open]       |
+--------------------------------------------+
|  THREAD: Diaz <-> Jack (Rocky)             |
| +----------------------------------------+ |
| | Jack: pickup is anytime before 6 (2:10)| |
| | Diaz: is the deposit refundable if we  | |
| |       cancel? (2:12) . read . typing.. | |
| +----------------------------------------+ |
|  You are VIEWING (staff can't see you)      |
| [ Join thread ]   [ Take over ]            |
| +-- takeover: replies send as MGMT, staff  |
|     muted, customer sees 'Sunrise (mgmt)' -+|
+--------------------------------------------+
```

- **Key elements:** Oversight toggle + scope switch (all vs mine); filter chips (flagged, unanswered, med-related, billing); thread list showing customer, pet, assigned staff, last-message preview, unanswered timer, and med/flag badges; live thread view with read receipts + typing indicators; a mode banner making clear the manager is invisibly viewing; Join vs Take Over actions.
- **Interactions:** 'Viewing' is silent and logged. 'Join thread' adds the manager as a visible participant (customer sees Sunrise mgmt, staff still active). 'Take over' mutes the staffer and routes the customer to management identity; every state change (view/join/takeover/handback) is written to the audit log with timestamps. Flagged/unanswered ordering is driven by SLA timers; med-flagged threads can jump the queue. Full-res photos and read receipts render inline. SMS/email only appear as nudge links, never as the thread transport.
- **Backed by:** owned in-app messaging (Postgres threads, read receipts, typing, full-res media) + oversight/takeover layer + role-based visibility; SLA/unanswered timers; audit log; push notifications (nudge links out, portal is source of truth).


### Live Med / Feeding / Task Board

*Watch the per-dog timed medication/feeding/task checklist across all in-house dogs in real time — see what's done, due, and overdue, who it's routed to, and intervene when something is missed.*

```
+--------------------------------------------+
| Task Board  Wed Jul3  [Today v]  7/11 done |
| routes to on-shift: Jack T. (7a-3p)        |
+--------------------------------------------+
|  OVERDUE (1)                          (!)  |
| +----------------------------------------+ |
| | 2:00 PM  Bella  Insulin 4u (SC)   +38m | |
| |  assigned: Jack   NOT DONE             | |
| |  [Ping Jack]  [Reassign]  [Mark done*] | |
| +----------------------------------------+ |
|  UPCOMING                                   |
| | 4:00 PM  Biscuit  Rimadyl 75mg  w/food | |
| | 4:00 PM  Cooper   dinner 1.5c kibble   | |
| | 6:30 PM  Bella    dinner + insulin 4u  | |
| | 8:00 PM  Rocky    walk 15min           | |
|  DONE TODAY                                 |
| | 8:00 AM  Biscuit  Rimadyl 75mg  Jack.v | |
| |   "took w/ pb, ate fine" +photo        | |
| | 8:00 AM  Bella    Insulin 4u    Jack.v | |
| | 12:30PM  all      lunch feed    Jack   | |
+--------------------------------------------+
|  * mgmt override is logged & flagged        |
+--------------------------------------------+
```

- **Key elements:** Header shows date, done/total, and which on-shift staffer tasks route to; three sections (Overdue with minutes-late, Upcoming with exact local times, Done with completion note/photo and the completer's initials + verified check); per-task dose/instructions in realistic terms; management-only override and reassign controls.
- **Interactions:** Each task stores local time + zone and fires a push to the on-shift staffer at its time; if unacknowledged past a grace window it flips to OVERDUE and escalates to management (drives the header badge on Dashboard). 'Ping Jack' re-sends the push; 'Reassign' routes to another on-shift/on-call staffer; 'Mark done' is a management override that is visibly flagged and audit-logged (staff completion is the normal path). Completing a task can attach a note + full-res photo that also lands in the dog's report card and the owner thread.
- **Backed by:** med/task scheduler (timed, per-dog, local-time+zone storage, routing to on-shift staff) + escalation engine + open-shift assignment (who is on-shift) + report card generator (completions feed cards) + audit log (overrides).


### Report Card Review & Send

*Review/curate the auto-assembled daily report card for a dog (tasks, meals, meds, potty, mood, photos) before it goes to the owner — the customer-facing warm artifact that management quality-controls.*

```
+--------------------------------------------+
| Report Card - draft         Biscuit        |
| Golden Retriever . Owner: Ramos . Jul3     |
+--------------------------------------------+
|  MOOD:  ( happy v )   Energy: (**** )      |
|--------------------------------------------|
|  PHOTOS (choose up to 4)                    |
|  [x][img][img][ ]  [ ][img][img][ ]         |
|   3 selected            [+ from feed]      |
|--------------------------------------------|
|  MEALS       breakfast [x] full            |
|              dinner    [x] full            |
|  MEDS        Rimadyl 75mg 8a [x] on time   |
|  POTTY       pee 4 / poo 2  normal         |
|  ACTIVITY    2 walks, yard play, naps      |
|--------------------------------------------|
|  STAFF NOTE (goes to owner)                 |
|  +--------------------------------------+   |
|  | Biscuit had a great day! Made a      |   |
|  | new friend at the fence.             |   |
|  +--------------------------------------+   |
|  auto-filled from tasks - edit freely      |
|--------------------------------------------|
|  UPSELL SUGGESTION (optional)               |
|  [+ add 'Nature walk $12' to next stay]    |
|  [ Save draft ]        [ Send to owner ]   |
+--------------------------------------------+
```

- **Key elements:** Header with dog/breed/owner/date; editable mood + energy; photo picker sourced from the day's all-photos feed (cap selection); auto-populated meals/meds/potty/activity pulled straight from the task board; free-text staff note pre-filled from completions; optional upsell attach from the catalog; save-draft vs send.
- **Interactions:** Card is auto-assembled from that day's completed tasks/meds/meals and the photo feed; management edits any field before sending. 'Send to owner' posts the card into the owner's in-app thread with a portal push (SMS/email nudge link if unopened), records it in the audit log, and locks the draft. Adding an upsell suggestion creates a one-tap purchase for the owner. Photos are full-res; deselecting removes from card but keeps in the internal feed. A staff-drafted card can be routed to management for approval before it can send.
- **Backed by:** report card generator (assembles from med/task scheduler completions + photo feed) + all-photos feed + upsell/catalog + in-app messaging (delivery to owner) + payments (upsell) + audit log.


### Reports & Audit Log

*Business oversight: occupancy, revenue, and outstanding balances over time, plus a tamper-evident audit trail of every sensitive action (approvals, takeovers, med overrides) — accountability for a multi-person family business.*

```
+--------------------------------------------+
| Reports          [ July 2026 v ]  [export] |
+--------------------------------------------+
|  OCCUPANCY                                  |
|  avg 74%   peak Jul4-5 100%                 |
|  |  .  ..:||:.  .  |  (nights, bars)        |
|--------------------------------------------|
|  REVENUE (Jul)                              |
|  Boarding  $3,540                           |
|  Upsells   $  640   (walks, baths)          |
|  ----------------                           |
|  Total     $4,180                           |
|  OUTSTANDING  $560  (3 invoices) [chase>]  |
|--------------------------------------------|
|  BY STAFF                                    |
|  Jack  14 shifts  46 tasks  98% on-time    |
|  Maria 11 shifts  33 tasks 100% on-time    |
+--------------------------------------------+
|  AUDIT LOG                        [filter] |
| 2:48p Corry APPROVED booking Rocky Jul4-6  |
| 2:41p Brette TOOK OVER thread Diaz<->Jack  |
| 2:38p Mom   OVERRIDE med done Bella insulin|
| 1:10p Corry APPROVED claim Maria Jul4 7-3  |
| 12:0p Jack  SENT report card Biscuit       |
|   [load more]                              |
+--------------------------------------------+
```

- **Key elements:** Period selector + export; occupancy summary with per-night bars and peak call-out; revenue split boarding vs upsells with outstanding-balance and a chase action; per-staff productivity/reliability; a reverse-chronological audit log of sensitive actions (booking approvals, message takeovers, med overrides, card sends) with actor, action, object, and time.
- **Interactions:** Period selector re-queries aggregations. 'Export' produces CSV/PDF for the family's records. 'chase' opens the outstanding invoices and can fire payment-reminder nudges into owner threads. Audit log is append-only and filterable by actor or action type; each entry deep-links to the affected object (booking, thread, task). This screen consumes the same audit events emitted by the takeover, approval, and med-override flows elsewhere.
- **Backed by:** reporting/aggregations service (occupancy from reservations, revenue from payments/upsells, outstanding from invoices, staff stats from task/shift completions) + append-only audit log (fed by messaging oversight, approval queues, med scheduler) + payments/invoicing.


---


*Screen specs generated from the 2026-07-03 design study (customer / staff / management agents). They are a starting inventory — add, merge, or split screens as the visual design demands.*
