# Host: zoomez — the single production VPS (DigitalOcean droplet, 4 GB / 2 vCPU).
{ lib, modulesPath, ... }:
{
  imports = [
    # DigitalOcean guest profile (virtio, qemu-guest, metadata). If the box ever
    # moves to Hetzner etc., swap this import for that provider's profile.
    "${modulesPath}/virtualisation/digital-ocean-config.nix"

    ./disko.nix

    ../../modules/options.nix
    ../../modules/core.nix
    ../../modules/secrets.nix
    ../../modules/postgres.nix
    ../../modules/caddy.nix
    ../../modules/garage.nix
    ../../modules/centrifugo.nix
    ../../modules/docuseal.nix
    ../../modules/zoomez-app.nix
    ../../modules/backups.nix
    ../../modules/monitoring.nix
  ];

  # ---- Host identity / provider quirks -------------------------------------
  networking.hostName = "zoomez";
  # DO assigns IPs via cloud-init, not DHCP (per nixos-anywhere-examples/digitalocean.nix).
  networking.useDHCP = lib.mkForce false;
  services.cloud-init.enable = true;

  # ---- Zoomez deployment variables (the ONLY file to touch for J2/A2) ------
  zoomez = {
    # TODO(J2): the real domain once registered. Caddy serves:
    #   https://<domain>        → app (PWA + API) + /connection/* → Centrifugo
    #   https://sign.<domain>   → DocuSeal
    #   https://s3.<domain>     → Garage S3 (presigned uploads/downloads)
    domain = "zoomez.example.com";
    acmeEmail = "justinan7@gmail.com";

    # TODO(A2): after `tailscale up`, set this host's tailnet IP (tailscale ip -4)
    # to enable the tailnet-only admin vhost (Uptime Kuma). null = vhost disabled.
    tailscaleIp = null;
    tailnetHost = "zoomez.lion-manta.ts.net";

    # TODO(A11): confirm the homelab ntfy endpoint + topic for failure alerts.
    ntfyUrl = "https://ntfy.4nunns.com/zoomez-alerts";

    # Flipped to true by task A3 once secrets/zoomez.yaml exists on the repo
    # and the host age key is in .sops.yaml.
    secretsProvisioned = false;

    # Set by task B14: zoomez.app.package = pkgs.callPackage ../../../server/package.nix { };
    app.enable = false;
  };

  # Never change casually; set once at install (task A1) and leave it.
  system.stateVersion = "26.05";
}
