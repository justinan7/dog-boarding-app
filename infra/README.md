# Zoomez production server — NixOS design

One NixOS VPS hosts everything: the database, the app, object storage, realtime,
e-signing, backups, and monitoring (ADR-003/009). The entire machine is this directory —
a flake; `nixos-rebuild switch --flake` **is** the deploy pipeline, and a config rollback
is one command. Every module/option name here was verified against **NixOS 26.05
"Yarara"** (current stable, released 2026-05-30) via a primary-source research pass on
2026-07-07 — corrections from that pass are baked in as comments.

**The headline:** the whole stack is **NixOS-native modules — zero containers**. Even
DocuSeal (Rails) has a first-class module since 25.11. No Docker, no podman, no image
pulls; one `git log` describes the entire machine over time.

## Host

| | |
|---|---|
| Provider | DigitalOcean droplet (Hetzner works identically — same install path, ~2× resources/$) |
| Size | **4 GB RAM / 2 vCPU / 80 GB disk** (≥2 GB required for the nixos-anywhere kexec install) |
| Disk | GPT: 1M BIOS-boot + 1G ESP + ext4 root (last, 100% — DO resize-safe); 4 GB swapfile |
| OS | NixOS 26.05, `system.stateVersion = "26.05"` |
| Cost | ~$24/mo droplet + ~$1–3/mo B2 offsite + domain |

**RAM budget (approx):** Postgres 300–500 MB · Node api+worker 300–400 · DocuSeal
(Rails + its dedicated Redis) 450–650 · Garage 150 · Centrifugo 30 · Kuma 150 ·
Netdata ~200 (cap dbengine if tight) · Caddy 50 → **~1.7–2.1 GB**, comfortable headroom.

## Service map

| Service | NixOS mechanism | Port (loopback unless noted) | Public exposure |
|---|---|---|---|
| Caddy | `services.caddy` | 80/443 all interfaces (+UDP 443 H3) | **The only public surface** — auto-TLS |
| App api (PWA + REST) | custom unit, `buildNpmPackage` + `importNpmLock` | 3000 | via `https://<domain>` |
| App worker (pg-boss) | second unit, same package | — | — |
| Centrifugo v6 | `services.centrifugo` | 8000 | via `https://<domain>/connection/*` |
| PostgreSQL 17 | `services.postgresql` | 5432 | never |
| Garage v2 (S3) | `services.garage` | 3900 s3 / 3901 rpc / 3903 admin | s3 via `https://s3.<domain>` (presigned) |
| DocuSeal | `services.docuseal` (+ its own `services.redis.servers.docuseal`) | 3002 ⚠ binds 0.0.0.0 — firewall keeps it private | via `https://sign.<domain>` |
| Uptime Kuma | `services.uptime-kuma` | 3001 | tailnet-only vhost `https://zoomez.<tailnet>.ts.net` |
| Netdata | `services.netdata` (cloud-free build) | 19999 | SSH forward only |
| pg dumps | `services.postgresqlBackup` | — | — |
| restic offsite | `services.restic.backups.offsite` | — | → Backblaze B2 |
| PITR | `services.pgbackrest` (completed in A10) | — | → B2, separate prefix |
| Tailscale | `services.tailscale` (+ Tailscale SSH) | UDP 41641 | admin plane |

## Network model

- **Public:** exactly TCP 80/443 (+UDP 443). Caddy routes by hostname: apex → app
  (with `/connection/*` split to Centrifugo), `sign.` → DocuSeal, `s3.` → Garage
  (⚠ never rewrite URIs on the s3 vhost — presigned SigV4 breaks).
- **Admin:** everything else rides the tailnet (`trustedInterfaces = ["tailscale0"]`).
  Tailscale SSH is the daily driver; keys-only sshd (not publicly open) is fallback #1;
  the DO recovery console is fallback #2. No fail2ban — nothing public to ban.
- The admin vhost binds the Tailscale IP and orders after `tailscaled.service`
  (boot-race mitigation, verified).

## Secrets

sops-nix (ADR-008): one age-encrypted `secrets/zoomez.yaml`, decrypted at activation by
the **host's SSH ed25519 key**; per-secret owner/mode/restartUnits; 1Password stays the
human vault of record. Full runbook + key inventory: [`secrets/README.md`](secrets/README.md).
All consumers take root-read `EnvironmentFile`s at stable `/run/secrets/*` paths, so the
flake evaluates before any secret exists (`zoomez.secretsProvisioned` gate).

## Backups & DR — three layers, all declarative

1. **Nightly logical dump** — `services.postgresqlBackup` (`pg_dumpall` → `/var/backup/postgresql`).
   The dumb, portable, restore-anywhere layer.
2. **Nightly encrypted offsite** — `services.restic.backups.offsite` → Backblaze B2:
   dumps + Garage data (the photos!) + DocuSeal files + Kuma state + `/etc/ssh`
   (host keys ⇒ restored box can still decrypt sops). Retention 7d/4w/6m, 5% data-verify
   per run, `restic-offsite` wrapper CLI preloaded on the host.
3. **Postgres PITR** — `services.pgbackrest` stanza → B2 (task A10; the syscall-filter
   fix it needs is documented in `modules/postgres.nix`). wal-g remains the documented
   fallback pattern if pgbackrest disappoints.

**Non-negotiable:** the quarterly **restore drill** (tasks A12/E3). Backups that haven't
been restored are hopes, not backups. Drill: fresh VM → restore restic snapshot + PITR to
a timestamp → app boots → write the drill log to this directory.

## Install & deploy

```bash
# 0. J1: create a stock Ubuntu droplet (≥2GB), root SSH key added. J5: tailscale authkey.
# 1. One-time install — wipes the disk, reboots into NixOS from this flake:
nix run github:nix-community/nixos-anywhere -- --flake ./infra#zoomez --target-host root@<droplet-ip>
#    (SSH host key changes — clear the known_hosts entry.)

# 2. Every deploy thereafter (build locally; droplet never compiles):
nixos-rebuild switch --flake ./infra#zoomez --target-host root@zoomez.lion-manta.ts.net

# 3. Pre-deploy smoke test — boots the exact config as a local QEMU VM:
nixos-rebuild build-vm --flake ./infra#zoomez && ./result/bin/run-zoomez-vm

# Rollback: reboot → pick previous generation, or
nixos-rebuild switch --rollback --target-host root@zoomez.lion-manta.ts.net
```

No `hardware-configuration.nix` needed: disko supplies filesystems and the DO profile
supplies virtio modules (verified; `build-vm` works without it).

## Upgrade policy

- **No auto-upgrades** (`system.autoUpgrade` off — verified footguns + stateful services
  with migration risk: Postgres majors, Rails migrations, Garage layouts).
- **Monthly, calendared:** after a green backup run — `nix flake update && nixos-rebuild
  build-vm` (smoke) `&& nixos-rebuild switch --flake …`. Read the DocuSeal/Garage notes
  in the module comments before big bumps.
- **Release upgrades** (26.05 → 26.11, ~Dec 2026): deliberate, after the .11 release
  settles; bump `nixpkgs.url`, read release notes, never touch `stateVersion`.
- Postgres majors are **manual `pg_upgrade`** — pinning `postgresql_17` means nothing
  upgrades by surprise.

## Runbooks

| Situation | Action |
|---|---|
| Service down | `systemctl status <svc>`; `journalctl -u <svc> -e`; a crash already pushed to ntfy |
| Bad deploy | `nixos-rebuild switch --rollback --target-host …` |
| Disk filling | Check `pg_stat_archiver` first (wedged WAL archiving fills `pg_wal` — Netdata watches this), then journald, then Garage growth |
| Restore drill / real DR | See Backups above; log every drill here |
| Secret rotation | `secrets/README.md` |
| Locked out of tailnet | keys-only sshd via… nothing public — use the DO recovery console |
| First-run per service | Runbook comments live in each module: Garage layout/buckets (A6), DB role passwords (A4), DocuSeal secret-key-base (A9), Kuma UI setup (A11) |

## What tasks A1–A12 still fill in (all marked `TODO(…)` in the files)

domain (J2) · SSH pubkeys (A1) · tailscale IP (A2) · `.sops.yaml` keys + `secrets/zoomez.yaml`
+ `secretsProvisioned = true` (A3) · DB role passwords (A4) · Garage layout/buckets/keys (A6) ·
DocuSeal secret-key-base (A9) · B2 bucket + pgbackrest stanza + archiving on (A10) ·
Kuma monitors/ntfy provider + external check from the homelab + unit-name verify (A11) ·
restore drill log (A12).

*Not yet machine-validated: no `nix` binary exists in the authoring sandbox, so this flake
has not been `nix flake check`ed — expect small syntax fixes on first eval. That's step
zero of task A1: `nix flake check ./infra` before touching any droplet.*
