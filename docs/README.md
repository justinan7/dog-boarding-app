# Documentation

**Implementers start here → [build-plan.md](build-plan.md)** (the master task list), and use
**[decisions.md](decisions.md)** to resolve any conflict between docs.

| Doc | Role |
|---|---|
| [build-plan.md](build-plan.md) | **The master task list** — workstreams, ownership, DoD + verify per task |
| [decisions.md](decisions.md) | ADR-lite decision log — newest entry wins doc conflicts |
| [api-contract.md](api-contract.md) | **Binding HTTP API contract** for PWA + iOS + Android + server |
| [data-model.md](data-model.md) | Entities, relationships, and the 6 invariants to test first |
| [architecture-and-components.md](architecture-and-components.md) | Stack rationale: 30-component inventory + verified OSS candidates (deployment substrate superseded by ADR-003 → [`../infra/`](../infra/)) |
| [design-brief.md](design-brief.md) | Pre-design screen inventory (historical; visual truth is now [`../design/`](../design/)) |
| [licenses.md](licenses.md) | AGPL decision, third-party license matrix, attribution duties, avoid-list |

*Produced from multi-agent studies on 2026-07-03 (components/licenses) and 2026-07-07 (NixOS infra).
Re-verify any dependency's license before adopting it — projects relicense.*
