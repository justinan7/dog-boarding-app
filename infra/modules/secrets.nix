# sops-nix wiring (ADR-008). Canonical secret VALUES live in 1Password
# (AgentAccess vault); secrets/zoomez.yaml is the machine-readable, age-encrypted
# copy this host decrypts with its SSH host key. See ../secrets/README.md for
# the A3 provisioning runbook and the exact contents of each secret.
#
# Design note: consumer modules reference secrets by their STABLE runtime paths
# ("/run/secrets/<name>") rather than config.sops.secrets.<n>.path, and this
# whole block is gated on zoomez.secretsProvisioned — so the flake evaluates,
# builds, and `build-vm`s before any secret material exists.
{ config, lib, ... }:
lib.mkIf config.zoomez.secretsProvisioned {
  sops.defaultSopsFile = ../secrets/zoomez.yaml;
  # Decrypt with the host's SSH ed25519 key (generated at install; converted to
  # an age identity at activation). Its age pubkey goes in ../.sops.yaml:
  #   nix run nixpkgs#ssh-to-age -- -i /etc/ssh/ssh_host_ed25519_key.pub
  sops.age.sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];

  sops.secrets = {
    # tskey-auth-… (reusable, pre-authorized, tagged) — J5.
    "tailscale-authkey" = { };

    # KEY=value env for the app (api + worker):
    #   DATABASE_URL, BETTER_AUTH_SECRET, S3_* (Garage key), CENTRIFUGO_HTTP_API_KEY,
    #   CENTRIFUGO_TOKEN_HMAC_SECRET_KEY, later STRIPE_*/TWILIO_*/RESEND_*.
    "zoomez-env" = { restartUnits = [ "zoomez-api.service" "zoomez-worker.service" ]; };

    # CENTRIFUGO_HTTP_API_KEY=…  CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY=…
    # (same two values as in zoomez-env — the app mints JWTs / calls the publish API)
    "centrifugo-env" = { restartUnits = [ "centrifugo.service" ]; };

    # GARAGE_RPC_SECRET=… (openssl rand -hex 32)  GARAGE_ADMIN_TOKEN=…
    "garage-env" = { restartUnits = [ "garage.service" ]; };

    # DATABASE_URL=postgresql://docuseal:…@127.0.0.1:5432/docuseal
    "docuseal-db-env" = { restartUnits = [ "docuseal.service" ]; };

    # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY for the offsite bucket (J3).
    "restic-env" = { };
    # restic repository password — losing THIS loses the backups; keep in 1Password.
    "restic-password" = { };

    # NTFY_TOKEN=tk_… for the homelab ntfy (empty file is fine for a public topic).
    "ntfy-env" = { };
  };
}
