#!/usr/bin/env bash
# Run the whole Zoomez app locally (Mac/Linux) with ZERO infrastructure.
# The dev database is PGlite (Postgres compiled to WASM, in-process) — no
# Postgres, no Docker, no Tailscale needed. Just Node 22+.
#
#   ./scripts/dev-local.sh          # start API + PWA (seeds demo data on first run)
#   ./scripts/dev-local.sh --reseed # wipe + reload the design's demo data, then start
#
# Then open http://localhost:5173 and SIGN UP (accounts are matched to a role by
# email — the API enforces the real role, the demo bar only swaps the view):
#   corry@zoomez.app  → Manager (all seeded data)   password: any 8+ chars
#   jack@zoomez.app   → Staff
#   anything else     → Customer (auto-provisioned)
# PIN-gated manager actions (approvals, Reports) use demo PIN 1234.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# --- prerequisites ---------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js not found. Install Node 22+ — e.g.  brew install node  (or https://nodejs.org)"; exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✗ Node $NODE_MAJOR found; this needs Node 22+.  brew upgrade node"; exit 1
fi

RESEED=0
[ "${1:-}" = "--reseed" ] && RESEED=1

# --- server (API) ----------------------------------------------------------
cd "$ROOT/server"
[ -d node_modules ] || { echo "→ installing server deps…"; npm install --no-fund --no-audit; }

if [ ! -f .env ]; then
  echo "→ creating server/.env (PGlite — zero-infra local DB)…"
  SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  cat > .env <<EOF
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
# In-process Postgres (WASM) persisted to server/.data/dev — no external DB needed.
DATABASE_URL=pglite://.data/dev
BETTER_AUTH_SECRET=$SECRET
EOF
fi

FRESH=0
[ -d .data/dev ] || FRESH=1
echo "→ applying migrations…"
npm run db:migrate
if [ "$FRESH" = "1" ] || [ "$RESEED" = "1" ]; then
  echo "→ loading demo data (Biscuit, Bella, the Jul stays, Diaz↔Jack thread…)…"
  npm run db:seed
fi

echo "→ starting API on http://localhost:3000 …"
npm run dev &
API_PID=$!
trap 'echo; echo "stopping…"; kill $API_PID 2>/dev/null || true' EXIT INT TERM

# --- web (PWA) -------------------------------------------------------------
cd "$ROOT/web"
[ -d node_modules ] || { echo "→ installing web deps…"; npm install --no-fund --no-audit; }

echo
echo "════════════════════════════════════════════════════════════"
echo "  Zoomez running locally"
echo "  PWA:  http://localhost:5173"
echo "  API:  http://localhost:3000/api/v1/health"
echo "  SIGN UP to log in (role is matched by email):"
echo "    corry@zoomez.app → Manager   jack@zoomez.app → Staff"
echo "    any other email  → Customer  (password: any 8+ chars)"
echo "  Approvals/Reports are PIN-gated · demo PIN 1234."
echo "  Demo bar (bottom of screen) swaps between the 3 views."
echo "  Ctrl-C to stop both."
echo "════════════════════════════════════════════════════════════"
echo
npm run dev
