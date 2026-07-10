# Base system: nix settings, SSH, firewall, Tailscale admin plane, ops tooling.
{ config, pkgs, ... }:
{
  # ---- Nix ------------------------------------------------------------------
  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    auto-optimise-store = true;
  };
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 30d";
  };

  # ---- Time / locale --------------------------------------------------------
  # Server clock stays UTC; the app stores wall-clock times + IANA zones itself
  # (data-model invariant 4) and the business displays Pacific in the clients.
  time.timeZone = "Etc/UTC";

  # ---- Users / SSH ----------------------------------------------------------
  users.users.root.openssh.authorizedKeys.keys = [
    # Deploy key (claude-jumpbox CT 133 — where rebuilds run from).
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFGQQi7TlO6MygZYzMHkPNyP9Rn2UpgcuMchBUIdktPt claude-jumpbox@ct133"
    # TODO: Justin's personal key(s) here.
  ];

  services.openssh = {
    enable = true;
    # Port 22 is NOT opened publicly — reachable only via the trusted tailnet
    # interface below. DO's recovery console is the true break-glass.
    openFirewall = false;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
  };
  # fail2ban deliberately omitted: no public SSH + keys-only ⇒ nothing to ban.

  # ---- Tailscale (admin plane) ----------------------------------------------
  services.tailscale = {
    enable = true;
    # Auth key (tskey-auth-…) provisioned via sops — see modules/secrets.nix.
    # The module's tailscaled-autoconnect unit joins only when logged out.
    authKeyFile = "/run/secrets/tailscale-authkey";
    authKeyParameters.preauthorized = true;
    useRoutingFeatures = "none";
    extraSetFlags = [ "--ssh" ]; # Tailscale SSH as daily driver; sshd = fallback
    openFirewall = true;         # UDP 41641 for direct WireGuard paths
    permitCertUid = "caddy";     # let Caddy fetch the *.ts.net cert from tailscaled
  };

  # ---- Firewall: public surface is Caddy only --------------------------------
  networking.firewall = {
    enable = true;
    # 80/443 (+ UDP 443 for HTTP/3) are opened by services.caddy.openFirewall.
    # Everything else — SSH, Postgres, Garage admin, Kuma, Netdata — rides the
    # tailnet. NOTE: DocuSeal's Rails binds 0.0.0.0:3002 regardless of its
    # `host` option (verified) — this closed-by-default firewall is what keeps
    # it private, so don't add its port here.
    trustedInterfaces = [ "tailscale0" ];
  };

  # ---- Auto-upgrades: OFF, deliberately ---------------------------------------
  # This box runs stateful services with real migration risk (Postgres majors,
  # DocuSeal/Rails migrations, Garage layout versions). Upgrades are a manual,
  # calendared act: `nix flake update && nixos-rebuild switch --flake .#zoomez
  # --target-host root@zoomez` right after a green backup run. See README.

  # ---- Ops tooling ------------------------------------------------------------
  environment.systemPackages = with pkgs; [
    vim git htop tmux curl jq
    config.services.garage.package # `garage` CLI MUST match the running daemon version
    sops age ssh-to-age
  ];

  # Keep journald from eating the disk.
  services.journald.extraConfig = ''
    SystemMaxUse=1G
    MaxRetentionSec=1month
  '';
}
