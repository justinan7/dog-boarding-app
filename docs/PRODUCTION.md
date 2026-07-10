# Production — https://zoomez.4nunns.com

**Live since 2026-07-10.** NixOS VM `zoomez` (VM 146 on boa-pve, 4 vCPU / 8 GB / 64 GB),
deployed from this repo's flake. Currently running the **demo world** (`DEMO_MODE=true`)
so Corey & Brette can explore with fake data; flip to real when they're ready.

## Topology

```
phone ── https://zoomez.4nunns.com ──► RackNerd Caddy (TLS) ──tailnet──► VM Caddy :80
                                                                         ├─ /connection/* → Centrifugo :8000
                                                                         └─ /* → zoomez-api :3000 (PWA + API)
        https://sign.zoomez.4nunns.com ─────────────────────────────────► DocuSeal :3002
        (admin, tailnet only) zoomez.lion-manta.ts.net ─────────────────► Uptime Kuma :3001
```

On the VM (all NixOS-native services): PostgreSQL 17 (dbs `zoomez` + `docuseal`),
Garage (S3: buckets `zoomez-media`/`zoomez-docs`), Centrifugo v6, DocuSeal,
zoomez-api + zoomez-worker (pg-boss med alerts), Caddy, Netdata, nightly pg dumps
(`/var/backup/postgresql`; offsite restic deferred — needs a B2 account).

- **VM**: `zoomez.lion-manta.ts.net` / 100.84.51.69 (tailnet; LAN via DHCP). SSH as root
  (tailnet-only — the firewall trusts `tailscale0`; break-glass: `qm guest exec 146` on boa-pve).
- **Secrets**: sops-nix — `infra/secrets/zoomez.yaml` (encrypted in-repo; decrypts with the
  VM's SSH host key or the admin age key). Values mirrored in 1Password `AgentAccess/Zoomez`.
- **Manager PIN**: the real 4-digit PIN is in `zoomez-env` (sops) / 1Password — 1234 is dev-only.

## Deploy a change

From the jumpbox (CT 133 — has nix + the deploy SSH key):

```bash
cd /opt/Projects/dog-boarding-app && git pull
nix run nixpkgs#nixos-rebuild -- switch --flake .#zoomez --target-host root@zoomez.lion-manta.ts.net
```

That rebuilds server+web packages from the committed tree and switches the VM. Migrations
do NOT auto-run in prod — after schema changes:

```bash
ssh root@zoomez.lion-manta.ts.net
set -a; source /run/secrets/zoomez-env; set +a; export NODE_ENV=production DEMO_MODE=true
PKG=$(dirname $(systemctl cat zoomez-api | grep ExecStart= | cut -d= -f2))
$PKG/zoomez-migrate            # apply migrations
$PKG/zoomez-seed               # OPTIONAL: wipe + reload the demo world (refuses if DEMO_MODE=false)
systemctl restart zoomez-api zoomez-worker
```

## Going live with real data (when Corey & Brette are ready)

1. `zoomez-seed` one last time never again — enter real customers/dogs instead.
2. Set `DEMO_MODE = "false"` in `infra/modules/zoomez-app.nix`, redeploy — demo bar,
   sign-up-as hints, and PIN hint disappear; the seeder refuses to run.
3. Finish DocuSeal (below), then decide on Stripe (needs the business's account).
4. Set up offsite backups (restic → B2/S3, ~$1/mo — the one paid thing worth doing).

## DocuSeal one-time setup (manual, ~10 min)

DocuSeal is running but needs ITS admin account created in a browser:

1. Open https://sign.zoomez.4nunns.com → complete the setup form (create the admin login).
2. In its UI: create the "Boarding agreement" template (upload the waiver PDF, place
   signature fields); note the template id from the URL.
3. Settings → API → copy the API token. Webhooks → add
   `https://zoomez.4nunns.com/api/v1/webhooks/docuseal?secret=<DOCUSEAL_WEBHOOK_SECRET from 1Password>`
   with the `form.completed` event.
4. Add to sops `zoomez-env`: `DOCUSEAL_API_KEY=<token>` and set
   `waiver_templates.docuseal_template_id = '<id>'` in the DB
   (`sudo -u postgres psql zoomez`). Redeploy/restart — the waiver flow goes live.

## Secrets / sops editing

```bash
ssh root@zoomez.lion-manta.ts.net
export SOPS_AGE_KEY=$(ssh-to-age -private-key -i /etc/ssh/ssh_host_ed25519_key)
sops /path/to/repo/infra/secrets/zoomez.yaml   # edit, then commit the file + redeploy
```

The admin age key (in 1Password) can rekey/recover if the VM is lost. Restoring the VM's
`/etc/ssh` from a backup keeps existing secrets decryptable.

## Monitoring

- Uptime Kuma (tailnet only): https://zoomez.lion-manta.ts.net — add checks + the
  med-alert dead-man's-switch push monitor (worker pings on alert dispatch — TODO).
- Netdata: `ssh -L 19999:127.0.0.1:19999 root@zoomez.lion-manta.ts.net` → http://localhost:19999
- Unit failures push to https://ntfy.4nunns.com/zoomez-alerts
