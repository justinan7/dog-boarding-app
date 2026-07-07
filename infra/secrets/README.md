# Secrets (task A3 runbook)

**Never commit plaintext here.** The only file that belongs in this directory is
`zoomez.yaml` — an age-encrypted sops file. Canonical values live in the 1Password
`AgentAccess` vault (ADR-008); this file is the machine-readable copy the host decrypts
at boot with its SSH host key.

## Provisioning (once, after A1/A2)

1. **Admin key** (on Justin's machine): `age-keygen -o ~/.config/sops/age/keys.txt` —
   put the *private* key file's contents in 1Password, the printed *public* key into
   [`../.sops.yaml`](../.sops.yaml) as `&admin`.
2. **Host key**: `ssh root@<host> 'nix run nixpkgs#ssh-to-age -- -i /etc/ssh/ssh_host_ed25519_key.pub'`
   → `.sops.yaml` as `&zoomez`.
3. **Create the file**: from `infra/` run `nix develop` then `sops secrets/zoomez.yaml`
   and fill in every key below (generate fresh values; mirror each into 1Password):

```yaml
tailscale-authkey: tskey-auth-…            # J5: reusable, pre-authorized, tagged
zoomez-env: |
  DATABASE_URL=postgresql://zoomez:…@127.0.0.1:5432/zoomez
  BETTER_AUTH_SECRET=…                     # openssl rand -hex 32
  S3_ENDPOINT=https://s3.<domain>
  S3_REGION=garage
  S3_ACCESS_KEY_ID=…                       # from `garage key create zoomez-app` (A6)
  S3_SECRET_ACCESS_KEY=…
  CENTRIFUGO_HTTP_API_KEY=…                # openssl rand -hex 32 — same value as below
  CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=…       # openssl rand -hex 32 — same value as below
centrifugo-env: |
  CENTRIFUGO_HTTP_API_KEY=…                # = the one in zoomez-env
  CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY=…# = CENTRIFUGO_TOKEN_HMAC_SECRET_KEY above
garage-env: |
  GARAGE_RPC_SECRET=…                      # openssl rand -hex 32
  GARAGE_ADMIN_TOKEN=…                     # openssl rand -hex 32
docuseal-db-env: |
  DATABASE_URL=postgresql://docuseal:…@127.0.0.1:5432/docuseal
restic-env: |
  AWS_ACCESS_KEY_ID=…                      # J3: B2 application key
  AWS_SECRET_ACCESS_KEY=…
restic-password: …                          # openssl rand -hex 32 — LOSING THIS LOSES BACKUPS
ntfy-env: |
  NTFY_TOKEN=…                              # may be empty for a public topic
```

4. Flip `zoomez.secretsProvisioned = true;` in `hosts/zoomez/default.nix`, deploy.
5. Verify: `ssh root@<host> ls -l /run/secrets/` shows every key, mode 0400.

## Rotation / rekeying

- Value change: update 1Password first, then `sops secrets/zoomez.yaml`, deploy —
  `restartUnits` bounces the consuming services automatically.
- Host reinstall regenerates host SSH keys → rerun step 2, then `sops updatekeys secrets/zoomez.yaml`.
  (The admin key in `.sops.yaml` is what makes this always possible — do not lose it.)
- Passwords set out-of-band on the DB (`ALTER ROLE …`, A4 runbook) must match the
  `DATABASE_URL`s here.
