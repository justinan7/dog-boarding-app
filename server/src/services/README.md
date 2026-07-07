# services/

Domain logic — the business rules, kept out of route handlers. One module per
bounded area as tasks land (booking capacity + approval, messaging + oversight,
care-task scheduling, workforce claims, pricing/refund, payments wrapper, …).

Rules (see ../../../docs/api-contract.md §6 and ../../../docs/data-model.md):
- Every state transition writes an audit row **in the same transaction**.
- Authorization is SQL-shaped (filter by ownership/role), never client-side.
- Race safety comes from DB constraints/row locks, not check-then-act.
- Schedule times store local wall-clock + IANA zone; compute UTC fire times.
