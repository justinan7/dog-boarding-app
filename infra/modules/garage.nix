# Garage — single-node S3 object storage (ADR-004). AGPL contained: reached
# only over the S3 API, run unmodified (see docs/licenses.md).
{ pkgs, ... }:
{
  services.garage = {
    enable = true;
    # REQUIRED — the module has no default package, so major upgrades (which
    # need release-note review / migrations) are always deliberate.
    package = pkgs.garage_2;

    # GARAGE_RPC_SECRET + GARAGE_ADMIN_TOKEN — never in `settings` (nix store
    # is world-readable). See modules/secrets.nix.
    environmentFile = "/run/secrets/garage-env";

    settings = {
      replication_factor = 1; # single node (>=1.0 key; replication_mode is pre-1.0)
      db_engine = "sqlite";   # fine at this scale
      rpc_bind_addr = "[::]:3901";
      rpc_public_addr = "127.0.0.1:3901";

      s3_api = {
        s3_region = "garage"; # SDK/client config must use region "garage"
        api_bind_addr = "127.0.0.1:3900"; # public access via Caddy s3.<domain> only
      };

      # Admin API: loopback only — reachable over the tailnet via SSH forward;
      # never proxied by Caddy.
      admin.api_bind_addr = "127.0.0.1:3903";
    };
  };

  # First-run runbook (task A6, once, on the box — CLI is in systemPackages and
  # MUST match the daemon version, which core.nix guarantees):
  #   garage status                                   # note the node ID
  #   garage layout assign -z dc1 -c 60G <node-id>
  #   garage layout apply --version 1
  #   garage bucket create zoomez-media
  #   garage bucket create zoomez-docs
  #   garage key create zoomez-app                    # → access/secret key → 1Password + zoomez-env
  #   garage bucket allow --read --write --owner zoomez-media --key zoomez-app
  #   garage bucket allow --read --write --owner zoomez-docs  --key zoomez-app
  # Data lives under /var/lib/garage (StateDirectory) — captured by restic.
}
