# Zoomez — web (PWA front-end)

React + TypeScript + Vite implementation of the Zoomez dog-boarding PWA. This first cut implements the
**Management view** from the Claude Design hi-fi handoff (`../design/`), pixel-faithful to the Zoomez
design system (tokens copied verbatim into `src/styles/`).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## What's implemented

The 5 Management screens from `design/Zoomez Management Hi-Fi.dc.html`, wired to the bottom-tab IA:

| Tab | Screen |
|---|---|
| **Dash** | Dashboard (live-ops): suites count, approval pills, overdue card, live board, in-residence chips |
| **Calendar** | Capacity calendar + booking approvals (FULL-night overlap warning, waiver-gated approve) |
| **Inbox** | Oversight periscope — silent viewing + slide-to-take-over a staff↔owner thread |
| **More** → | **Live task board** (screen 04) and **Reports + audit log** (screen 05) |
| **Photos** | Placeholder (not in the first hi-fi cut) |

## Design system

- **Tokens** — `src/styles/{colors,typography,spacing,effects}.css` are the exact Zoomez exports; loaded
  by `src/styles/index.css` along with the Instrument Serif + Figtree webfonts.
- **Primitives** — `src/components/primitives.tsx` (`Button`, `Badge`, `Card`, `Chip`, `DogAvatar`,
  `Wordmark`, `Eyebrow`, `Section`) reproduce the design-system component specs (variants/sizes/tones).
- **Icons** — `lucide-react` (matching the design's `lucide-static@0.469.0`), addressed by kebab name via
  `src/components/Icon.tsx`.

## Not yet done

Customer and Staff views (their hi-fi files are in `../design/`); real data/state (screens use the
design's sample content); PWA service worker; wiring to the Node/TS API. See
`../docs/architecture-and-components.md`.
