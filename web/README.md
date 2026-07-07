# Zoomez — web (PWA front-end)

React + TypeScript + Vite implementation of the Zoomez dog-boarding PWA. All **three role views** —
Customer, Staff, and Management — are implemented from the Claude Design hi-fi handoff (`../design/`),
pixel-faithful to the Zoomez design system (tokens copied verbatim into `src/styles/`).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

A **demo bar** pinned under the phone frame switches between the Customer / Staff / Manager views. The
*in-app* path mirrors the design: **Staff → Me → account sheet → Manager** is **PIN-gated** (demo PIN
`1234`); Manager → More → "View as staff" switches back.

## What's implemented (24 screens across 3 roles)

| Role | Screens |
|---|---|
| **Customer** (Home · Book · Messages · Pets · Account) | Home / stay dashboard, Book a stay (live add-on estimate), Report card postcard → full-bleed story viewer, Stay detail timeline, Messages thread, Payment (live upsell recalc), Pet profile, Account |
| **Staff** (Today · Shifts · Dogs · Messages · Me) | Today on-shift dashboard, Shift board (claim → pending flip), Dog checklist + Add-task bottom sheet, Report card builder, Dog roster, Incident report, Account/view switcher |
| **Management** (Dash · Calendar · Inbox · Photos · More) | Dashboard live-ops, Capacity calendar + approvals, Inbox oversight (periscope + slide-to-take-over), Live task board, Reports + audit log |

Screens carry the design's sample data and light local interactivity (chip selection, checkbox toggles,
add-on/upsell recalculation, shift claim state, PIN entry). No backend yet — see *Not yet done*.

## Design system

- **Tokens** — `src/styles/{colors,typography,spacing,effects}.css` are the exact Zoomez exports; loaded
  by `src/styles/index.css` with the Instrument Serif + Figtree webfonts.
- **Primitives** — `src/components/primitives.tsx`: `Button`, `Badge`, `Card`, `Chip`, `DogAvatar`,
  `Wordmark`, `Eyebrow`, `Section`, `SegmentedControl`, `Switch`, `Sheet` — all reproduce the
  design-system component specs (variants/sizes/tones).
- **Icons** — `lucide-react` (matching the design's `lucide-static@0.469.0`), addressed by the DS's
  kebab names via `src/components/Icon.tsx`.
- **Layout** — `src/screens/{customer,staff,management}/` one file per screen; `src/App.tsx` is the
  role-routed shell; `src/lib/nav.ts` holds the per-role tab configs and route types.

## Not yet done (task C3+ in `../docs/build-plan.md`)

Real login + data (screens use design sample content); the Centrifugo realtime client; PWA service
worker + web-push subscribe + install prompts; serving from the Node/TS monolith. All client work
builds against `../docs/api-contract.md`.
