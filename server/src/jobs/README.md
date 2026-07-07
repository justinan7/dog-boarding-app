# jobs/

Background jobs run by the **worker** process (`src/worker.ts`) via pg-boss
(task B8) — Postgres-backed, no Redis. Planned jobs:

- **care-alert** — fire a due med/feed/task push to the on-shift staffer; escalate → overdue → management.
- **reminder** — deposit/waiver/vax nudges.
- **stripe-reconcile** — sweep for missed/at-least-once webhook events.
- **media-process** — HEIC→JPEG + thumbnails after a presigned upload lands.
- **digest** — daily summaries.

Each timed job stores local time + IANA zone and computes the next UTC fire.
A startup catch-up sweep re-fires anything due that was missed while the worker
was down; a Kuma push heartbeat confirms each dispatch (dead-man's-switch).
