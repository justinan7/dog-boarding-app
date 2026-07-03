# Documentation

Design-phase docs for the Dog Boarding App. Read in this order:

1. **[architecture-and-components.md](architecture-and-components.md)** — the recommended stack, the
   30-component inventory, and the open-source candidates evaluated for each component (with verified
   SPDX licenses and fit scores). Start here.
2. **[data-model.md](data-model.md)** — draft entities, relationships, enums, and the invariants to test
   first (date-range overlap, race-safe shift claims, local-time+zone alerts, append-only audit).
3. **[design-brief.md](design-brief.md)** — for the UI designer: personas, information architecture, and
   a screen-by-screen inventory with lo-fi wireframe references for all three views.
4. **[licenses.md](licenses.md)** — the app's AGPL-3.0-or-later decision, the third-party license matrix,
   attribution obligations, and the source-available projects deliberately avoided.

*All four were produced from a multi-agent component/OSS/design study on 2026-07-03. Re-verify any
dependency's license before adopting it — projects relicense.*
