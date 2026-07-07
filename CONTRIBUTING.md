# Contributing

**All implementation work — human or model — starts at [`docs/build-plan.md`](docs/build-plan.md).**
Pick the next unblocked task in your workstream, follow its DoD and Verify steps, update the status
table, commit. Doc conflicts are resolved by [`docs/decisions.md`](docs/decisions.md).

## License of contributions

By contributing you agree that your contributions are licensed under the project's license,
**AGPL-3.0-or-later** (see [`LICENSE`](LICENSE)). Sign your commits off (DCO):

```
git commit -s -m "your message"
```

## Third-party dependencies

Every dependency's license matters here (see [`docs/licenses.md`](docs/licenses.md)):

- Prefer **OSI-approved** licenses. **Do not** add source-available dependencies (BSL, Elastic, SSPL,
  Commons Clause) — they break the open-source goal.
- **AGPL/GPL** projects are acceptable only when run **unmodified as a separate network service** (so
  copyleft stays contained), never vendored/linked into the app.
- Record any new dependency in the license matrix, and keep the third-party notices intact.

## Before writing code

Read [`docs/architecture-and-components.md`](docs/architecture-and-components.md) and
[`docs/data-model.md`](docs/data-model.md) first. The guiding rule for reaching for a dependency: *adopt
only if its integration + operational cost is genuinely lower than building the slice we need.*
