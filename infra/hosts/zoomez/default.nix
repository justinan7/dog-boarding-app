# Host: zoomez — production VM on the homelab Proxmox (boa-pve), 4 vCPU / 8 GB.
# TLS terminates at the RackNerd Caddy (https://zoomez.4nunns.com), which
# reverse-proxies over the tailnet to this VM's Caddy on :80. A future move to
# a paid VPS = re-enable ACME in modules/caddy.nix + swap this hardware block.
{ lib, pkgs, modulesPath, ... }:
{
  imports = [
    # Proxmox/QEMU guest (virtio drivers, guest agent expectations).
    (modulesPath + "/profiles/qemu-guest.nix")

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

  # ---- Host identity / networking -------------------------------------------
  networking.hostName = "zoomez";
  # DHCP on the homelab LAN (vmbr0). Stable addressing comes from Tailscale —
  # the RackNerd Caddy proxies to the VM's tailnet IP, not the LAN lease.
  networking.useDHCP = lib.mkDefault true;
  services.qemuGuest.enable = true; # `qm guest cmd network-get-interfaces` etc.

  # ---- Zoomez deployment variables ------------------------------------------
  zoomez = {
    domain = "zoomez.4nunns.com";
    acmeEmail = "justinan7@gmail.com"; # unused while TLS terminates upstream

    # Set after `tailscale up` (task A2): tailscale ip -4
    tailscaleIp = null;
    tailnetHost = "zoomez.lion-manta.ts.net";

    ntfyUrl = "https://ntfy.4nunns.com/zoomez-alerts";

    # Flipped to true once secrets/zoomez.yaml exists and the host age key is
    # in .sops.yaml (provisioning step A3).
    secretsProvisioned = true;

    app = {
      enable = true;
      package = pkgs.callPackage ../../../server/package.nix { };
      webRoot = pkgs.callPackage ../../../web/package.nix { };
    };
  };

  # Never change casually; set once at install and leave it.
  system.stateVersion = "26.05";
}
